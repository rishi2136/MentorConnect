import { Router } from "express";
import {
  changeFreeSessionSetting,
  createMyMentorProfile,
  deleteMyMentorProfile,
  getMentorById,
  getMyMentorProfile,
  searchMentors,
  updateMyMentorProfile,
} from "../controllers/mentor-profile.controller.js";
import { requireAuthentication, requireRole } from "../middleware/auth.middleware.js";

const mentorProfileRouter = Router();

/**
 * GET /api/mentors/search
 * Search and filter public available mentor profiles with pagination.
 *
 * Access: Public
 * Query Parameters:
 *   - q?: string (matches mentor name, biography, expertise, skills, or languages)
 *   - language?: string | string[] (comma-separated or multiple query params)
 *   - domain?: string | string[] (comma-separated or multiple query params)
 *   - minExperience?: number
 *   - maxExperience?: number
 *   - minPrice?: number (charges >= minPrice)
 *   - maxPrice?: number (charges <= maxPrice)
 *   - minRating?: number (rating >= minRating)
 *   - dayOfWeek?: number (0 for Sunday through 6 for Saturday)
 *   - availableFrom?: string ("HH:mm" format, e.g. "09:00")
 *   - availableTo?: string ("HH:mm" format, e.g. "17:00")
 *   - page?: number (default: 1)
 *   - limit?: number (default: 20, max: 100)
 * Response: 200 OK with {
 *   profiles: PublicMentor[],
 *   page: number,
 *   limit: number,
 *   total: number
 * }
 */
mentorProfileRouter.get("/search", searchMentors);

/**
 * GET /api/mentors/me
 * Retrieve the full private profile of the currently authenticated mentor.
 *
 * Access: Authenticated mentor
 * Headers: Cookie (session ID)
 * Response: 200 OK with { profile }
 * Errors: 401 Unauthorized, 403 Forbidden (if not mentor), 404 Not Found
 */
mentorProfileRouter.get("/me", requireAuthentication, requireRole("mentor"), getMyMentorProfile);

/**
 * POST /api/mentors
 * Create a new mentor profile for the currently authenticated mentor account.
 *
 * Access: Authenticated mentor
 * Headers: Cookie (session ID)
 * Body: {
 *   yearsOfExperience?: number,
 *   aboutMe?: string,
 *   expertise?: string[],
 *   languages?: string[],
 *   skills?: string[],
 *   availability?: [{ dayOfWeek: number, startTime: string, endTime: string }],
 *   timezone?: string (IANA timezone used to interpret weekly availability),
 *   charges?: number,
 *   isCharged?: boolean,
 *   paymentInfo?: Record<string, unknown>,
 *   isAvailable?: boolean
 * }
 * Response: 201 Created with { profile }
 * Errors: 400 Bad Request, 401 Unauthorized, 403 Forbidden, 409 Conflict (if profile exists)
 */
mentorProfileRouter.post("/", requireAuthentication, requireRole("mentor"), createMyMentorProfile);

/**
 * PUT /api/mentors/me
 * Update the profile of the currently authenticated mentor.
 *
 * Access: Authenticated mentor
 * Headers: Cookie (session ID)
 * Body: Subset of mentor profile fields (at least one field required)
 * Response: 200 OK with { profile }
 * Errors: 400 Bad Request (empty payload), 401 Unauthorized, 403 Forbidden, 404 Not Found
 */
mentorProfileRouter.put("/me", requireAuthentication, requireRole("mentor"), updateMyMentorProfile);

/**
 * DELETE /api/mentors/me
 * Delete the profile of the currently authenticated mentor.
 *
 * Access: Authenticated mentor
 * Headers: Cookie (session ID)
 * Response: 200 OK with { message: "Mentor profile deleted" }
 * Errors: 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict (if referenced by sessions)
 */
mentorProfileRouter.delete("/me", requireAuthentication, requireRole("mentor"), deleteMyMentorProfile);

/**
 * PATCH /api/mentors/me/free-session
 * Toggle whether free session requests are accepted by this mentor.
 *
 * Access: Authenticated mentor
 * Headers: Cookie (session ID)
 * Body: { enabled: boolean }
 * Response: 200 OK with { isFreeSessionEnabled: boolean }
 * Errors: 400 Bad Request (enabled not boolean), 401 Unauthorized, 403 Forbidden, 404 Not Found
 */
mentorProfileRouter.patch("/me/free-session", requireAuthentication, requireRole("mentor"), changeFreeSessionSetting);

/**
 * GET /api/mentors/:mentorProfileId
 * Retrieve a single mentor's public profile and user details by profile ID.
 *
 * Access: Public
 * Path Parameters:
 *   - mentorProfileId: string (MongoDB ObjectId)
 * Response: 200 OK with { mentor: PublicMentorProfile & { user: { id, fullName } } }
 * Errors: 400 Bad Request (invalid ObjectId format), 404 Not Found
 */
mentorProfileRouter.get("/:mentorProfileId", getMentorById);

export default mentorProfileRouter;
