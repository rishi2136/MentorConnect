import type { Request, Response } from "express";
import {
  changeAudioMeetSessionStatus,
  createAudioMeetSession,
  deleteAudioMeetSession as removeAudioMeetSession,
  getAudioMeetSession as findAudioMeetSession,
  listMyAudioMeetSessions,
  updateAudioMeetSession as updateAudioMeetSessionRecord,
} from "../services/audio-meet-session.service.js";
import { getCallIceServerConfiguration } from "../services/ice-server.service.js";
import { ApiError } from "../services/api-error.service.js";
import { getRequestBody, requiredString } from "../utils/request-validation.js";
import { parseIsoInstant } from "../utils/timezone.js";

const sessionStatuses = ["accepted", "rejected", "cancelled", "completed"] as const;

function getUser(req: Request) {
  return req.user!;
}

export async function createSession(req: Request, res: Response) {
  console.log("Creating video meet session with body:", req.body);
  const body = getRequestBody(req.body);
  let scheduledAt: Date;
  try {
    scheduledAt = parseIsoInstant(requiredString(body, "scheduledAt"));
  } catch (error) {
    throw new ApiError(
      error instanceof Error ? error.message : "scheduledAt must be an ISO 8601 timestamp",
      400
    );
  }
  const durationMinutes = body.durationMinutes ?? 30;
  if (typeof durationMinutes !== "number" || !Number.isInteger(durationMinutes)) {
    throw new ApiError("durationMinutes must be an integer", 400);
  }
  const mode = body.mode ?? "video";
  if (mode !== "video") {
    throw new ApiError("Only video sessions are supported", 400);
  }

  const session = await createAudioMeetSession({
    userId: getUser(req).id,
    mentorProfileId: requiredString(body, "mentorProfileId"),
    topic: requiredString(body, "topic"),
    notes: typeof body.notes === "string" ? body.notes.trim() : "",
    scheduledAt,
    durationMinutes,
    mode,
  });
  res.status(201).json({ session });
}

export async function listSessions(req: Request, res: Response) {
  const sessions = await listMyAudioMeetSessions(
    getUser(req).id,
    getUser(req).access
  );
  res.status(200).json({ sessions });
}

export async function getSession(req: Request, res: Response) {
  const sessionId = req.params.sessionId;
  const session = await findAudioMeetSession(
    Array.isArray(sessionId) ? sessionId[0]! : sessionId!,
    getUser(req).id,
    getUser(req).access
  );
  res.status(200).json({ session, serverTime: new Date().toISOString() });
}

export async function getCallIceServers(req: Request, res: Response) {
  res.setHeader("Cache-Control", "no-store");
  const sessionId = req.params.sessionId;
  const configuration = await getCallIceServerConfiguration(
    Array.isArray(sessionId) ? sessionId[0]! : sessionId!,
    getUser(req).id,
    getUser(req).access
  );
  res.status(200).json(configuration);
}

export async function updateSession(req: Request, res: Response) {
  const body = getRequestBody(req.body);
  const allowedFields = ["topic", "notes", "scheduledAt", "durationMinutes", "mode"] as const;
  const fields = Object.fromEntries(
    Object.entries(body).filter(([field]) => allowedFields.includes(field as typeof allowedFields[number]))
  );
  const unsupportedField = Object.keys(body).find(
    (field) => !allowedFields.includes(field as typeof allowedFields[number])
  );
  if (unsupportedField) {
    throw new ApiError(`Unsupported field: ${unsupportedField}`, 400);
  }

  if (fields.topic !== undefined && typeof fields.topic !== "string") {
    throw new ApiError("topic must be a string", 400);
  }
  if (fields.notes !== undefined && typeof fields.notes !== "string") {
    throw new ApiError("notes must be a string", 400);
  }
  if (fields.scheduledAt !== undefined && typeof fields.scheduledAt !== "string") {
    throw new ApiError("scheduledAt must be an ISO 8601 date string", 400);
  }
  if (fields.durationMinutes !== undefined &&
      (typeof fields.durationMinutes !== "number" || !Number.isInteger(fields.durationMinutes))) {
    throw new ApiError("durationMinutes must be an integer", 400);
  }
  if (fields.mode !== undefined && fields.mode !== "video") {
    throw new ApiError("Only video sessions are supported", 400);
  }

  let scheduledAt: Date | undefined;
  if (typeof fields.scheduledAt === "string") {
    try {
      scheduledAt = parseIsoInstant(fields.scheduledAt);
    } catch (error) {
      throw new ApiError(
        error instanceof Error ? error.message : "scheduledAt must be an ISO 8601 timestamp",
        400
      );
    }
  }
  const sessionId = req.params.sessionId;
  const session = await updateAudioMeetSessionRecord(
    Array.isArray(sessionId) ? sessionId[0]! : sessionId!,
    getUser(req).id,
    getUser(req).access,
    {
      ...(fields.topic !== undefined ? { topic: fields.topic as string } : {}),
      ...(fields.notes !== undefined ? { notes: fields.notes as string } : {}),
      ...(scheduledAt !== undefined ? { scheduledAt } : {}),
      ...(fields.durationMinutes !== undefined
        ? { durationMinutes: fields.durationMinutes as number }
        : {}),
      ...(fields.mode !== undefined ? { mode: "video" as const } : {}),
    }
  );
  res.status(200).json({ session });
}

export async function deleteSession(req: Request, res: Response) {
  const sessionId = req.params.sessionId;
  const result = await removeAudioMeetSession(
    Array.isArray(sessionId) ? sessionId[0]! : sessionId!,
    getUser(req).id,
    getUser(req).access
  );
  res.status(200).json({
    message: "Session and its conversation were deleted",
    ...result,
  });
}

export async function updateSessionStatus(req: Request, res: Response) {
  const body = getRequestBody(req.body);
  if (typeof body.status !== "string" || !sessionStatuses.includes(body.status as typeof sessionStatuses[number])) {
    throw new ApiError(`status must be one of: ${sessionStatuses.join(", ")}`, 400);
  }

  const sessionId = req.params.sessionId;
  const result = await changeAudioMeetSessionStatus(
    Array.isArray(sessionId) ? sessionId[0]! : sessionId!,
    getUser(req).id,
    getUser(req).access,
    body.status as typeof sessionStatuses[number]
  );
  res.status(200).json(result);
}