import type { IncomingMessage } from "node:http";
import { isValidObjectId } from "mongoose";
import { Server } from "socket.io";
import type { Server as HttpServer } from "node:http";
import passport from "./config/passport.js";
import { sessionMiddleware } from "./app.js";
import { AudioMeetSessionModel } from "./models/audio-meet-session.model.js";
import { ChatMessageModel } from "./models/chat-message.model.js";
import { MentorProfileModel } from "./models/mentor.model.js";
import { StudentProfileModel } from "./models/student.model.js";
import { setRealtimeServer } from "./services/realtime.service.js";

type SocketRequest = IncomingMessage & { user?: Express.User };
type Ack<T> = ((response: T) => void) | undefined;
type Participant = {
  id: string;
  fullName: string;
  access: Express.User["access"];
};
type CallableSession = {
  studentId: unknown;
  mentorId: unknown;
  status: string;
  mode: "video";
  scheduledAt: Date;
  durationMinutes: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function canJoinSession(sessionId: string, participant: Participant) {
  if (!isValidObjectId(sessionId)) return false;
  const session = await AudioMeetSessionModel.findById(sessionId)
    .select("studentId mentorId")
    .lean();
  if (!session) return false;
  if (participant.access.includes("admin")) return true;

  if (participant.access.includes("student")) {
    const profile = await StudentProfileModel.findOne({
      userId: participant.id,
    }).select("_id");
    if (profile && String(session.studentId) === String(profile._id)) return true;
  }

  if (participant.access.includes("mentor")) {
    const profile = await MentorProfileModel.findOne({
      userId: participant.id,
    }).select("_id");
    if (profile && String(session.mentorId) === String(profile._id)) return true;
  }

  return false;
}

async function getCallableSession(
  sessionId: string,
  participant: Participant
): Promise<CallableSession | null> {
  if (!isValidObjectId(sessionId) || participant.access.includes("admin")) {
    return null;
  }
  const session = await AudioMeetSessionModel.findById(sessionId)
    .select("studentId mentorId status mode scheduledAt durationMinutes")
    .lean();
  if (!session || session.status !== "accepted") return null;

  const startsAt = new Date(session.scheduledAt).getTime();
  const endsAt = startsAt + session.durationMinutes * 60_000;
  const now = Date.now();
  if (now < startsAt - 5 * 60_000 || now > endsAt) return null;

  const isStudent = participant.access.includes("student")
    ? await StudentProfileModel.exists({
        userId: participant.id,
        _id: session.studentId,
      })
    : null;
  if (isStudent) {
    return {
      ...session,
      mode: "video",
    };
  }

  const isMentor = participant.access.includes("mentor")
    ? await MentorProfileModel.exists({
        userId: participant.id,
        _id: session.mentorId,
      })
    : null;
  return isMentor
    ? { ...session, mode: "video" }
    : null;
}

function isValidDescription(value: unknown): value is {
  type: "offer" | "answer";
  sdp: string;
} {
  return (
    isRecord(value) &&
    (value.type === "offer" || value.type === "answer") &&
    typeof value.sdp === "string" &&
    value.sdp.length > 0 &&
    value.sdp.length <= 100_000
  );
}

function isValidCandidate(value: unknown): value is {
  candidate: string;
  sdpMid: string | null;
  sdpMLineIndex: number | null;
} {
  return (
    isRecord(value) &&
    typeof value.candidate === "string" &&
    value.candidate.length <= 4096 &&
    (value.sdpMid === undefined ||
      typeof value.sdpMid === "string" ||
      value.sdpMid === null) &&
    (value.sdpMLineIndex === undefined ||
      typeof value.sdpMLineIndex === "number" ||
      value.sdpMLineIndex === null)
  );
}

export function attachSocketServer(httpServer: HttpServer) {
  const clientOrigin = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";
  const io = new Server(httpServer, {
    cors: { origin: clientOrigin, credentials: true },
    maxHttpBufferSize: 1e6,
  });

  io.engine.use(sessionMiddleware);
  io.engine.use(passport.initialize());
  io.engine.use(passport.session());
  io.use((socket, next) => {
    const user = (socket.request as SocketRequest).user;
    if (!user) {
      next(new Error("Authentication is required"));
      return;
    }
    socket.data.participant = {
      id: user.id,
      fullName: user.fullName,
      access: user.access,
    } satisfies Participant;
    next();
  });

  setRealtimeServer(io);

  io.on("connection", (socket) => {
    const participant = socket.data.participant as Participant;
    socket.join(`user:${participant.id}`);
    if (participant.access.includes("admin")) socket.join("admins");

    socket.on(
      "call:join",
      async (
        payload: unknown,
        acknowledge: Ack<{
          mode?: "video";
          peers?: string[];
          error?: string;
        }>
      ) => {
        const sessionId =
          isRecord(payload) && typeof payload.sessionId === "string"
            ? payload.sessionId
            : "";
        try {
          const session = await getCallableSession(sessionId, participant);
          if (!session) {
            acknowledge?.({
              error:
                "Only session participants can join an accepted call during its scheduled time.",
            });
            return;
          }

          const room = `call:${sessionId}`;
          const existingSockets = await io.in(room).fetchSockets();
          const existingParticipants = [
            ...new Set(
              existingSockets.map(
                (peer) => (peer.data.participant as Participant).id
              )
            ),
          ];
          if (
            existingParticipants.includes(participant.id) ||
            existingParticipants.length >= 2
          ) {
            acknowledge?.({
              error:
                "This call is already open for your account or has reached its participant limit.",
            });
            return;
          }
          await socket.join(room);
          acknowledge?.({
            mode: "video",
            peers: existingParticipants,
          });
          socket.to(room).emit("call:peer-joined", {
            sessionId,
            participantId: participant.id,
          });
        } catch (error) {
          console.error("Failed to join session call", error);
          acknowledge?.({ error: "Could not join this session call." });
        }
      }
    );

    socket.on("call:leave", (payload: unknown) => {
      const sessionId =
        isRecord(payload) && typeof payload.sessionId === "string"
          ? payload.sessionId
          : "";
      const room = `call:${sessionId}`;
      if (!isValidObjectId(sessionId) || !socket.rooms.has(room)) return;
      socket.leave(room);
      socket.to(room).emit("call:peer-left", { sessionId });
    });

    socket.on(
      "call:signal",
      async (payload: unknown) => {
        const body = isRecord(payload) ? payload : null;
        const sessionId =
          typeof body?.sessionId === "string"
            ? body.sessionId
            : "";
        const type = body?.type;
        const room = `call:${sessionId}`;
        if (!isValidObjectId(sessionId) || !socket.rooms.has(room)) return;

        try {
          if (!(await getCallableSession(sessionId, participant))) {
            socket.emit("call:error", {
              sessionId,
              message: "This call is no longer available.",
            });
            return;
          }
          if (
            (type === "offer" || type === "answer") &&
            isValidDescription(body?.description)
          ) {
            socket.to(room).emit("call:signal", {
              sessionId,
              type,
              description: body.description,
            });
            return;
          }

          if (type === "candidate" && isValidCandidate(body?.candidate)) {
            socket.to(room).emit("call:signal", {
              sessionId,
              type,
              candidate: body.candidate,
            });
          }
        } catch (error) {
          console.error("Failed to validate call signaling", error);
          socket.emit("call:error", {
            sessionId,
            message: "Could not validate call signaling. Please reconnect.",
          });
        }
      }
    );

    socket.on(
      "conversation:leave",
      (payload: unknown) => {
        const sessionId =
          isRecord(payload) && typeof payload.sessionId === "string"
            ? payload.sessionId
            : "";
        if (isValidObjectId(sessionId)) socket.leave(`session:${sessionId}`);
      }
    );

    socket.on(
      "conversation:join",
      async (
        payload: unknown,
        acknowledge: Ack<{ messages?: unknown[]; error?: string }>
      ) => {
        const sessionId =
          isRecord(payload) && typeof payload.sessionId === "string"
            ? payload.sessionId
            : "";
        try {
          if (!(await canJoinSession(sessionId, participant))) {
            acknowledge?.({ error: "You are not allowed to access this conversation" });
            return;
          }
          const room = `session:${sessionId}`;
          await socket.join(room);
          const messages = await ChatMessageModel.find({ sessionId })
            .sort({ createdAt: -1 })
            .limit(100)
            .populate("senderId", "fullName")
            .lean();
          acknowledge?.({
            messages: messages.reverse().map((message) => {
              const sender = message.senderId as unknown as {
                _id: unknown;
                fullName: string;
              };
              return {
                id: String(message._id),
                sessionId,
                text: message.text,
                senderId: String(sender._id),
                senderName: sender.fullName,
                createdAt: message.createdAt.toISOString(),
              };
            }),
          });
        } catch (error) {
          console.error("Failed to load conversation", error);
          acknowledge?.({ error: "Could not load this conversation" });
        }
      }
    );

    socket.on(
      "chat:send",
      async (
        payload: unknown,
        acknowledge: Ack<{ message?: unknown; error?: string }>
      ) => {
        const sessionId =
          isRecord(payload) && typeof payload.sessionId === "string"
            ? payload.sessionId
            : "";
        const text =
          isRecord(payload) && typeof payload.text === "string"
            ? payload.text.trim()
            : "";
        try {
          if (!text || text.length > 2000) {
            acknowledge?.({ error: "Message must contain 1 to 2000 characters" });
            return;
          }
          if (!(await canJoinSession(sessionId, participant))) {
            acknowledge?.({ error: "You are not allowed to send messages here" });
            return;
          }
          const saved = await ChatMessageModel.create({
            sessionId,
            senderId: participant.id,
            text,
          });
          const message = {
            id: String(saved._id),
            sessionId,
            text: saved.text,
            senderId: participant.id,
            senderName: participant.fullName,
            createdAt: saved.createdAt.toISOString(),
          };
          io.to(`session:${sessionId}`).emit("chat:message", message);
          io.to("admins").emit("chat:activity", {
            sessionId,
            senderId: participant.id,
            senderName: participant.fullName,
            text,
            createdAt: message.createdAt,
          });
          acknowledge?.({ message });
        } catch (error) {
          console.error("Failed to send chat message", error);
          acknowledge?.({ error: "Could not send this message" });
        }
      }
    );

    socket.on("disconnecting", () => {
      for (const room of socket.rooms) {
        if (room.startsWith("call:")) {
          socket.to(room).emit("call:peer-left", {
            sessionId: room.slice("call:".length),
          });
        }
      }
    });
  });

  return io;
}
