import { createHmac } from "node:crypto";
import { isValidObjectId } from "mongoose";
import { AudioMeetSessionModel } from "../models/audio-meet-session.model.js";
import { MentorProfileModel } from "../models/mentor.model.js";
import { StudentProfileModel } from "../models/student.model.js";
import { ApiError } from "./api-error.service.js";

const defaultStunUrls = ["stun:stun.l.google.com:19302"];

type IceServer = RTCIceServer;

export function buildIceServers(
  userId: string,
  environment: NodeJS.ProcessEnv = process.env,
  now = Date.now()
) {
  const stunUrls = (environment.STUN_SERVER_URLS ?? defaultStunUrls.join(","))
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);
  const turnUrls = (environment.TURN_SERVER_URLS ?? "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);
  const iceServers: IceServer[] = [];

  if (stunUrls.length > 0) iceServers.push({ urls: stunUrls });
  if (turnUrls.length === 0) {
    return { iceServers, turnConfigured: false };
  }

  const sharedSecret = environment.TURN_SHARED_SECRET;
  if (!sharedSecret) {
    throw new ApiError(
      "TURN_SERVER_URLS is configured without TURN_SHARED_SECRET",
      503
    );
  }

  const ttlSeconds = Number(environment.TURN_CREDENTIAL_TTL_SECONDS ?? 3600);
  if (!Number.isInteger(ttlSeconds) || ttlSeconds < 60 || ttlSeconds > 86_400) {
    throw new ApiError(
      "TURN_CREDENTIAL_TTL_SECONDS must be an integer from 60 to 86400",
      500
    );
  }

  const expiresAt = Math.floor(now / 1000) + ttlSeconds;
  const username = `${expiresAt}:${userId}`;
  const credential = createHmac("sha1", sharedSecret)
    .update(username)
    .digest("base64");
  iceServers.push({ urls: turnUrls, username, credential });

  return {
    iceServers,
    turnConfigured: true,
    expiresAt: new Date(expiresAt * 1000).toISOString(),
  };
}

export async function getCallIceServerConfiguration(
  sessionId: string,
  userId: string,
  roles: Array<"admin" | "student" | "mentor">
) {
  if (!isValidObjectId(sessionId)) {
    throw new ApiError("Session ID is invalid", 400);
  }
  if (roles.includes("admin") || (!roles.includes("student") && !roles.includes("mentor"))) {
    throw new ApiError("Only session participants can configure a call", 403);
  }

  const session = await AudioMeetSessionModel.findById(sessionId)
    .select("studentId mentorId status scheduledAt durationMinutes")
    .lean();
  if (!session) throw new ApiError("Session was not found", 404);
  if (session.status !== "accepted") {
    throw new ApiError("The session must be accepted before joining a call", 409);
  }

  const startsAt = new Date(session.scheduledAt).getTime();
  const endsAt = startsAt + session.durationMinutes * 60_000;
  const now = Date.now();
  if (now < startsAt - 5 * 60_000 || now > endsAt) {
    throw new ApiError("The call is outside its scheduled time window", 409);
  }

  const [student, mentor] = await Promise.all([
    roles.includes("student")
      ? StudentProfileModel.exists({ _id: session.studentId, userId })
      : null,
    roles.includes("mentor")
      ? MentorProfileModel.exists({ _id: session.mentorId, userId })
      : null,
  ]);
  if (!student && !mentor) {
    throw new ApiError("You are not a participant in this call", 403);
  }

  return buildIceServers(userId);
}
