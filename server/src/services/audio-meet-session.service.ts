import { isValidObjectId } from "mongoose";
import { AudioMeetSessionModel } from "../models/audio-meet-session.model.js";
import { ChatMessageModel } from "../models/chat-message.model.js";
import { MentorProfileModel } from "../models/mentor.model.js";
import type { MentorProfile } from "../models/mentor.model.js";
import { StudentProfileModel } from "../models/student.model.js";
import { ApiError } from "./api-error.service.js";
import {
  broadcastSessionDeleted,
  broadcastSessionUpdate,
} from "./realtime.service.js";
import {
  DEFAULT_TIME_ZONE,
  isWithinMentorAvailability,
} from "../utils/timezone.js";
import {
  getMentorSessionCountDelta,
  isMentorSessionCounted,
} from "../utils/mentor-session-count.js";

type SessionStatus = "requested" | "accepted" | "rejected" | "cancelled" | "completed";
type SessionMode = "video";
type UserRole = "admin" | "student" | "mentor";

type SessionEditableFields = {
  topic?: string;
  notes?: string;
  scheduledAt?: Date;
  durationMinutes?: number;
  mode?: SessionMode;
};

async function getProfileIds(userId: string, role: UserRole) {
  const profile = role === "student"
    ? await StudentProfileModel.findOne({ userId }).select("_id")
    : await MentorProfileModel.findOne({ userId }).select("_id");
  if (!profile) {
    throw new ApiError(`${role === "student" ? "Student" : "Mentor"} profile was not found`, 404);
  }
  return profile._id;
}

function validateSessionAvailability(
  mentor: Pick<MentorProfile, "availability" | "timezone">,
  scheduledAt: Date,
  durationMinutes: number
) {
  if (!Number.isFinite(scheduledAt.getTime()) || scheduledAt <= new Date()) {
    throw new ApiError("Session must be scheduled for a future date", 400);
  }
  if (!Number.isInteger(durationMinutes) || durationMinutes < 15 || durationMinutes > 180) {
    throw new ApiError("durationMinutes must be an integer from 15 to 180", 400);
  }

  const endsAt = new Date(scheduledAt.getTime() + durationMinutes * 60_000);
  const timezone = mentor.timezone || DEFAULT_TIME_ZONE;
  let matchingAvailability: boolean;
  try {
    matchingAvailability = isWithinMentorAvailability(
      scheduledAt,
      durationMinutes,
      timezone,
      mentor.availability
    );
  } catch (error) {
    if (error instanceof RangeError) {
      throw new ApiError("Mentor profile contains an invalid timezone", 400);
    }
    throw error;
  }
  if (!matchingAvailability) {
    throw new ApiError("Requested time is outside the mentor's availability", 409);
  }
  return endsAt;
}

async function findSessionOverlap(
  mentorId: unknown,
  scheduledAt: Date,
  endsAt: Date,
  excludedSessionId?: string
) {
  const query: Record<string, unknown> = {
    mentorId,
    status: { $in: ["requested", "accepted"] },
    $expr: {
      $and: [
        { $lt: ["$scheduledAt", endsAt] },
        {
          $gt: [
            { $add: ["$scheduledAt", { $multiply: ["$durationMinutes", 60_000] }] },
            scheduledAt,
          ],
        },
      ],
    },
  };
  if (excludedSessionId) query._id = { $ne: excludedSessionId };
  return AudioMeetSessionModel.findOne(query);
}

async function updateMentorSessionCount(mentorProfileId: unknown, delta: number) {
  if (delta === 0) {
    const mentor = await MentorProfileModel.findById(mentorProfileId).select(
      "sessionCount"
    );
    if (!mentor) throw new ApiError("Mentor profile was not found", 404);
    return mentor.sessionCount ?? 0;
  }

  const mentor =
    delta > 0
      ? await MentorProfileModel.findByIdAndUpdate(
          mentorProfileId,
          { $inc: { sessionCount: delta } },
          { new: true, runValidators: true }
        ).select("sessionCount")
      : await MentorProfileModel.findOneAndUpdate(
          { _id: mentorProfileId, sessionCount: { $gt: 0 } },
          { $inc: { sessionCount: delta } },
          { new: true, runValidators: true }
        ).select("sessionCount");

  if (mentor) return mentor.sessionCount ?? 0;
  if (delta < 0) {
    const existingMentor = await MentorProfileModel.findById(
      mentorProfileId
    ).select("sessionCount");
    if (existingMentor) return existingMentor.sessionCount ?? 0;
  }
  throw new ApiError("Mentor profile was not found", 404);
}

export async function createAudioMeetSession(input: {
  userId: string;
  mentorProfileId: string;
  topic: string;
  notes: string;
  scheduledAt: Date;
  durationMinutes: number;
  mode: SessionMode;
}) {
  if (!isValidObjectId(input.mentorProfileId)) {
    throw new ApiError("Mentor profile ID is invalid", 400);
  }

  const studentId = await getProfileIds(input.userId, "student");
  const mentor = await MentorProfileModel.findById(input.mentorProfileId);
  if (!mentor || !mentor.isAvailable) {
    throw new ApiError("Mentor is not available for sessions", 404);
  }
  const endsAt = validateSessionAvailability(
    mentor,
    input.scheduledAt,
    input.durationMinutes
  );
  const overlap = await findSessionOverlap(
    mentor._id,
    input.scheduledAt,
    endsAt
  );
  if (overlap) throw new ApiError("Mentor already has a session at that time", 409);

  if (!mentor.isFreeSessionEnabled && mentor.charges === undefined) {
    throw new ApiError("Mentor has not configured a session price", 409);
  }

  const session = await AudioMeetSessionModel.create({
    studentId,
    mentorId: mentor._id,
    requestedBy: input.userId,
    topic: input.topic,
    notes: input.notes,
    scheduledAt: input.scheduledAt,
    scheduledTimezone: mentor.timezone || DEFAULT_TIME_ZONE,
    durationMinutes: input.durationMinutes,
    mode: input.mode,
    status: "requested",
    price: mentor.isFreeSessionEnabled ? 0 : mentor.charges ?? 0,
    isFreeSession: mentor.isFreeSessionEnabled,
  });
  broadcastSessionUpdate(session, [input.userId, String(mentor.userId)]);
  return session;
}

export async function updateAudioMeetSession(
  sessionId: string,
  userId: string,
  roles: UserRole[],
  changes: SessionEditableFields
) {
  if (!isValidObjectId(sessionId)) throw new ApiError("Session ID is invalid", 400);
  if (!roles.includes("student")) {
    throw new ApiError("Only the student who requested this session can edit it", 403);
  }
  const session = await AudioMeetSessionModel.findById(sessionId);
  if (!session) throw new ApiError("Session was not found", 404);
  const student = await StudentProfileModel.findOne({ userId }).select("_id");
  if (!student || String(session.studentId) !== String(student._id)) {
    throw new ApiError("You are not allowed to edit this session", 403);
  }
  if (session.status !== "requested" || session.scheduledAt <= new Date()) {
    throw new ApiError("Only future session requests can be edited", 409);
  }
  if (Object.keys(changes).length === 0) {
    throw new ApiError("At least one editable session field is required", 400);
  }

  const mentor = await MentorProfileModel.findById(session.mentorId);
  if (!mentor) throw new ApiError("Mentor profile was not found", 404);
  const scheduledAt = changes.scheduledAt ?? session.scheduledAt;
  const durationMinutes = changes.durationMinutes ?? session.durationMinutes;
  const scheduleChanged =
    scheduledAt.getTime() !== session.scheduledAt.getTime() ||
    durationMinutes !== session.durationMinutes;
  if (scheduleChanged) {
    if (!mentor.isAvailable) {
      throw new ApiError("Mentor is no longer available for sessions", 409);
    }
    const endsAt = validateSessionAvailability(
      mentor,
      scheduledAt,
      durationMinutes
    );
    const overlap = await findSessionOverlap(
      mentor._id,
      scheduledAt,
      endsAt,
      sessionId
    );
    if (overlap) {
      throw new ApiError("Mentor already has a session at that time", 409);
    }
  }

  if (changes.topic !== undefined) {
    const topic = changes.topic.trim();
    if (topic.length < 2 || topic.length > 160) {
      throw new ApiError("topic must contain 2 to 160 characters", 400);
    }
    session.topic = topic;
  }
  if (changes.notes !== undefined) {
    if (changes.notes.length > 2000) {
      throw new ApiError("notes cannot exceed 2000 characters", 400);
    }
    session.notes = changes.notes.trim();
  }
  session.scheduledAt = scheduledAt;
  if (scheduleChanged) {
    session.scheduledTimezone = mentor.timezone || DEFAULT_TIME_ZONE;
  }
  session.durationMinutes = durationMinutes;
  if (changes.mode !== undefined) session.mode = changes.mode;
  await session.save();
  broadcastSessionUpdate(session, [userId, String(mentor.userId)]);
  return session;
}

export async function deleteAudioMeetSession(
  sessionId: string,
  userId: string,
  roles: UserRole[]
) {
  if (!isValidObjectId(sessionId)) throw new ApiError("Session ID is invalid", 400);
  const session = await AudioMeetSessionModel.findById(sessionId);
  if (!session) throw new ApiError("Session was not found", 404);
  if (!(await canAccessSession(session, userId, roles))) {
    throw new ApiError("You are not allowed to delete this session", 403);
  }
  const isPast =
    session.scheduledAt.getTime() + session.durationMinutes * 60_000 <= Date.now();
  if (session.status !== "completed" && !isPast) {
    throw new ApiError(
      "Only completed or past sessions can be deleted",
      409
    );
  }

  const [student, mentor] = await Promise.all([
    StudentProfileModel.findById(session.studentId).select("userId"),
    MentorProfileModel.findById(session.mentorId).select("userId"),
  ]);
  const deletedSession = await AudioMeetSessionModel.findOneAndDelete({
    _id: sessionId,
    status: session.status,
  });
  if (!deletedSession) {
    throw new ApiError("Session was updated by another action. Refresh and try again.", 409);
  }

  await ChatMessageModel.deleteMany({ sessionId: deletedSession._id });
  const mentorSessionCount = isMentorSessionCounted(deletedSession.status)
    ? await updateMentorSessionCount(deletedSession.mentorId, -1)
    : undefined;
  broadcastSessionDeleted(sessionId, [
    ...(student ? [String(student.userId)] : []),
    ...(mentor ? [String(mentor.userId)] : []),
  ], mentorSessionCount === undefined
    ? undefined
    : { mentorProfileId: String(deletedSession.mentorId), sessionCount: mentorSessionCount });
  return {
    mentorProfileId: String(deletedSession.mentorId),
    mentorSessionCount,
  };
}

export async function listMyAudioMeetSessions(userId: string, roles: UserRole[]) {
  if (roles.includes("admin")) {
    return AudioMeetSessionModel.find()
      .sort({ scheduledAt: -1 })
      .populate({ path: "studentId", select: "collegeName course userId", populate: { path: "userId", select: "fullName" } })
      .populate({ path: "mentorId", select: "userId expertise timezone", populate: { path: "userId", select: "fullName" } });
  }

  const profileId = await getProfileIds(userId, roles.includes("mentor") ? "mentor" : "student");
  const field = roles.includes("mentor") ? "mentorId" : "studentId";
  return AudioMeetSessionModel.find({ [field]: profileId })
    .sort({ scheduledAt: -1 })
    .populate({ path: "studentId", select: "collegeName course userId", populate: { path: "userId", select: "fullName" } })
    .populate({ path: "mentorId", select: "userId expertise timezone", populate: { path: "userId", select: "fullName" } });
}

export async function getAudioMeetSession(sessionId: string, userId: string, roles: UserRole[]) {
  if (!isValidObjectId(sessionId)) throw new ApiError("Session ID is invalid", 400);
  const session = await AudioMeetSessionModel.findById(sessionId);
  if (!session) throw new ApiError("Session was not found", 404);
  if (!(await canAccessSession(session, userId, roles))) {
    throw new ApiError("You are not allowed to access this session", 403);
  }

  await session.populate([
    { path: "studentId", select: "collegeName course userId", populate: { path: "userId", select: "fullName" } },
    { path: "mentorId", select: "userId expertise timezone", populate: { path: "userId", select: "fullName" } },
  ]);
  return session;
}

async function canAccessSession(
  session: { studentId: unknown; mentorId: unknown },
  userId: string,
  roles: UserRole[]
) {
  if (roles.includes("admin")) return true;
  if (roles.includes("student")) {
    const studentId = await StudentProfileModel.findOne({ userId }).select("_id");
    if (studentId && String(session.studentId) === String(studentId._id)) return true;
  }
  if (roles.includes("mentor")) {
    const mentorId = await MentorProfileModel.findOne({ userId }).select("_id");
    if (mentorId && String(session.mentorId) === String(mentorId._id)) return true;
  }
  return false;
}

export async function changeAudioMeetSessionStatus(
  sessionId: string,
  userId: string,
  roles: UserRole[],
  nextStatus: SessionStatus
) {
  if (!isValidObjectId(sessionId)) throw new ApiError("Session ID is invalid", 400);
  const session = await AudioMeetSessionModel.findById(sessionId);
  if (!session) throw new ApiError("Session was not found", 404);
  if (!(await canAccessSession(session, userId, roles))) {
    throw new ApiError("You are not allowed to update this session", 403);
  }

  const isStudentOwner = roles.includes("student") && String(session.studentId) === String(await StudentProfileModel.findOne({ userId }).select("_id").then((profile) => profile?._id));
  const isMentorOwner = roles.includes("mentor") && String(session.mentorId) === String(await MentorProfileModel.findOne({ userId }).select("_id").then((profile) => profile?._id));
  const validStudentChange = isStudentOwner && nextStatus === "cancelled" && ["requested", "accepted"].includes(session.status);
  const validMentorChange = isMentorOwner && (
    (nextStatus === "accepted" || nextStatus === "rejected") && session.status === "requested" ||
    nextStatus === "completed" && session.status === "accepted"
  );

  if (!validStudentChange && !validMentorChange) {
    throw new ApiError("This session status transition is not allowed", 409);
  }

  const previousStatus = session.status as SessionStatus;
  const updatedSession = await AudioMeetSessionModel.findOneAndUpdate(
    { _id: sessionId, status: previousStatus },
    { $set: { status: nextStatus } },
    { new: true, runValidators: true }
  );
  if (!updatedSession) {
    throw new ApiError("Session was updated by another action. Refresh and try again.", 409);
  }

  const mentorSessionCountDelta = getMentorSessionCountDelta(
    previousStatus,
    nextStatus
  );
  const mentorSessionCount =
    mentorSessionCountDelta === 0
      ? undefined
      : await updateMentorSessionCount(
          updatedSession.mentorId,
          mentorSessionCountDelta
        );
  const [student, mentor] = await Promise.all([
    StudentProfileModel.findById(updatedSession.studentId).select("userId"),
    MentorProfileModel.findById(updatedSession.mentorId).select("userId"),
  ]);
  broadcastSessionUpdate(updatedSession, [
    ...(student ? [String(student.userId)] : []),
    ...(mentor ? [String(mentor.userId)] : []),
  ], mentorSessionCount === undefined
    ? undefined
    : {
        mentorProfileId: String(updatedSession.mentorId),
        sessionCount: mentorSessionCount,
      });
  return {
    session: updatedSession,
    mentorProfileId: String(updatedSession.mentorId),
    mentorSessionCount,
  };
}