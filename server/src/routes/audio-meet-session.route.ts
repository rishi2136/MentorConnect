import { Router } from "express";
import {
  createSession,
  deleteSession,
  getCallIceServers,
  getSession,
  listSessions,
  updateSession,
  updateSessionStatus,
} from "../controllers/audio-meet-session.controller.js";
import { requireAuthentication, requireRole } from "../middleware/auth.middleware.js";

const audioMeetSessionRouter = Router();

// Enforce authentication on all /api/audio-meet-sessions endpoints
audioMeetSessionRouter.use(requireAuthentication);

/**
 * POST /api/audio-meet-sessions
 * Create a new video-meet session request with a mentor.
 *
 * Access: Authenticated student only
 * Headers: Cookie (session ID)
 * Body: {
 *   mentorProfileId: string (MongoDB ObjectId of the mentor's profile),
 *   topic: string (session subject / discussion topic),
 *   notes?: string (optional prep notes or context for the mentor),
 *   scheduledAt: string (ISO 8601 date string, must be in the future),
 *   durationMinutes?: number (integer duration, default: 30),
 *   mode?: "video" (default: "video"; audio sessions are not supported)
 * }
 * Response: 201 Created with { session } (initial status: "requested").
 * scheduledAt is stored as a UTC instant; booking availability and displayed
 * session instants are UTC; availability is evaluated in the mentor's IANA timezone.
 * Errors:
 *   - 400 Bad Request (validation failure, past date, or outside mentor availability)
 *   - 401 Unauthorized
 *   - 403 Forbidden (user is not a student)
 *   - 404 Not Found (mentor profile or student profile not found)
 *   - 409 Conflict (overlapping scheduled session exists)
 */
audioMeetSessionRouter.post("/", requireRole("student"), createSession);

/**
 * GET /api/audio-meet-sessions/me
 * List sessions relevant to the authenticated caller.
 *   - Students receive their booked sessions.
 *   - Mentors receive sessions requested from / scheduled with them.
 *   - Admins receive all sessions in the platform.
 *
 * Access: Authenticated student, mentor, or admin
 * Headers: Cookie (session ID)
 * Response: 200 OK with { sessions: AudioMeetSession[] }
 * Errors: 401 Unauthorized, 403 Forbidden
 */
audioMeetSessionRouter.get("/me", requireRole("student", "mentor", "admin"), listSessions);

/**
 * GET /api/audio-meet-sessions/:sessionId/ice-servers
 * Return STUN servers and short-lived TURN credentials for an active call.
 *
 * Access: Authenticated student or mentor who participates in the accepted session
 */
audioMeetSessionRouter.get(
  "/:sessionId/ice-servers",
  requireRole("student", "mentor"),
  getCallIceServers
);

/**
 * GET /api/audio-meet-sessions/:sessionId
 * Retrieve details of a specific session by its ID.
 *
 * Access: Authenticated session participant (student or mentor) or admin
 * Headers: Cookie (session ID)
 * Path Parameters:
 *   - sessionId: string (MongoDB ObjectId)
 * Response: 200 OK with { session }
 * Errors:
 *   - 400 Bad Request (invalid ObjectId)
 *   - 401 Unauthorized
 *   - 403 Forbidden (caller is neither a participant nor an admin)
 *   - 404 Not Found
 */
audioMeetSessionRouter.get("/:sessionId", requireRole("student", "mentor", "admin"), getSession);

/**
 * PUT /api/audio-meet-sessions/:sessionId
 * Update a future request while it is still awaiting mentor approval.
 * The student owner may change its topic, notes, video mode, duration, or time;
 * the requested time is revalidated against mentor availability and conflicts.
 *
 * Access: The student who created the session
 */
audioMeetSessionRouter.put(
  "/:sessionId",
  requireRole("student"),
  updateSession
);

/**
 * DELETE /api/audio-meet-sessions/:sessionId
 * Delete a completed or past session and its session chat history.
 *
 * Access: A student or mentor who participates in the session
 */
audioMeetSessionRouter.delete(
  "/:sessionId",
  requireRole("student", "mentor"),
  deleteSession
);

/**
 * PATCH /api/audio-meet-sessions/:sessionId/status
 * Transition the status of an audio-meet session and broadcast real-time update.
 *
 * Access: Authenticated session participant (student or mentor)
 * Headers: Cookie (session ID)
 * Path Parameters:
 *   - sessionId: string (MongoDB ObjectId)
 * Body: {
 *   status: "accepted" | "rejected" | "cancelled" | "completed"
 * }
 * Permitted Transitions:
 *   - Student: "requested" -> "cancelled", "accepted" -> "cancelled"
 *   - Mentor:  "requested" -> "accepted", "requested" -> "rejected", "accepted" -> "completed"
 * Response: 200 OK with { session }
 * Errors:
 *   - 400 Bad Request (invalid status value)
 *   - 401 Unauthorized
 *   - 403 Forbidden (caller is not allowed to perform the requested transition)
 *   - 404 Not Found
 */
audioMeetSessionRouter.patch("/:sessionId/status", requireRole("student", "mentor"), updateSessionStatus);

export default audioMeetSessionRouter;
