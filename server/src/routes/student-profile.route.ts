import { Router } from "express";
import {
  createMyStudentProfile,
  deleteMyStudentProfile,
  getMyStudentProfile,
  updateMyStudentProfile,
} from "../controllers/student-profile.controller.js";
import { requireAuthentication, requireRole } from "../middleware/auth.middleware.js";

const studentProfileRouter = Router();

// Enforce authentication and student role on all /api/students routes
studentProfileRouter.use(requireAuthentication, requireRole("student"));

/**
 * GET /api/students/me
 * Retrieve the profile of the currently authenticated student.
 *
 * Access: Authenticated student
 * Headers: Cookie (session ID)
 * Response: 200 OK with { profile }
 * Errors: 401 Unauthorized, 403 Forbidden (if not student), 404 Not Found
 */
studentProfileRouter.get("/me", getMyStudentProfile);

/**
 * POST /api/students
 * Create a new student profile for the currently authenticated student.
 *
 * Access: Authenticated student
 * Headers: Cookie (session ID)
 * Body: {
 *   collegeName: string,
 *   yearStart: number,
 *   yearEnd: number,
 *   course: string,
 *   batch: string,
 *   resume?: { url: string, storageKey: string, mimeType: string, size: number },
 *   experienceDocuments?: Array<{ url: string, storageKey: string, mimeType: string, size: number }>,
 *   experienceSummary?: string,
 *   payment?: Record<string, unknown>
 * }
 * Response: 201 Created with { profile }
 * Errors: 400 Bad Request, 401 Unauthorized, 403 Forbidden, 409 Conflict (if profile exists)
 */
studentProfileRouter.post("/", createMyStudentProfile);

/**
 * PUT /api/students/me
 * Update the profile of the currently authenticated student.
 *
 * Access: Authenticated student
 * Headers: Cookie (session ID)
 * Body: Subset of student profile fields to update (at least one field required)
 * Response: 200 OK with { profile }
 * Errors: 400 Bad Request (empty payload), 401 Unauthorized, 403 Forbidden, 404 Not Found
 */
studentProfileRouter.put("/me", updateMyStudentProfile);

/**
 * DELETE /api/students/me
 * Delete the profile of the currently authenticated student.
 *
 * Access: Authenticated student
 * Headers: Cookie (session ID)
 * Response: 200 OK with { message: "Student profile deleted" }
 * Errors: 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict (if referenced by sessions)
 */
studentProfileRouter.delete("/me", deleteMyStudentProfile);

export default studentProfileRouter;
