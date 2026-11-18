import type { Server } from "socket.io";

let realtimeServer: Server | undefined;

export function setRealtimeServer(server: Server) {
  realtimeServer = server;
}

export function broadcastSessionUpdate(
  session: {
    _id: unknown;
    status: string;
    scheduledAt: Date;
  },
  participantUserIds: string[],
  mentorSessionCount?: { mentorProfileId: string; sessionCount: number }
) {
  if (!realtimeServer) return;

  const update = {
    sessionId: String(session._id),
    status: session.status,
    scheduledAt: session.scheduledAt.toISOString(),
  };
  realtimeServer.to("admins").emit("session:updated", update);
  for (const userId of new Set(participantUserIds)) {
    realtimeServer.to(`user:${userId}`).emit("session:updated", update);
  }
  if (mentorSessionCount) {
    realtimeServer.emit("mentor:session-count-updated", mentorSessionCount);
  }
  if (session.status !== "accepted") {
    realtimeServer.to(`call:${update.sessionId}`).emit("call:ended", {
      sessionId: update.sessionId,
      status: session.status,
    });
  }
}

export function broadcastSessionDeleted(
  sessionId: string,
  participantUserIds: string[],
  mentorSessionCount?: { mentorProfileId: string; sessionCount: number }
) {
  if (!realtimeServer) return;
  const event = { sessionId };
  realtimeServer.to("admins").emit("session:deleted", event);
  for (const userId of new Set(participantUserIds)) {
    realtimeServer.to(`user:${userId}`).emit("session:deleted", event);
  }
  if (mentorSessionCount) {
    realtimeServer.emit("mentor:session-count-updated", mentorSessionCount);
  }
}
