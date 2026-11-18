import { Router } from "express";
import passport, { isGoogleAuthConfigured } from "../config/passport.js";
import {
  getCurrentUser,
  googleCallback,
  login,
  logout,
  signup,
} from "../controllers/user.controller.js";
import { requireAuthentication } from "../middleware/auth.middleware.js";

const userRouter = Router();

/**
 * POST /api/users/signup
 * Register a new user account and establish an authenticated session cookie.
 *
 * Access: Public
 * Body: { email, password, fullName, access?: "student" | "mentor" } (default access: "student")
 * Response: 201 Created with { user: { id, username, email, fullName, access } }
 */
userRouter.post("/signup", signup);

/**
 * POST /api/users/login
 * Authenticate with email and password and establish an authenticated session cookie.
 *
 * Access: Public
 * Body: { email, password }
 * Response: 200 OK with { user: { id, username, email, fullName, access } }
 */
userRouter.post("/login", login);

/**
 * POST /api/users/logout
 * Destroy the current session in MongoDB and clear the session cookie.
 *
 * Access: Authenticated users only
 * Headers: Cookie (session ID)
 * Response: 200 OK with { message: "Logged out successfully" }
 */
userRouter.post("/logout", requireAuthentication, logout);

/**
 * GET /api/users/me
 * Retrieve the current authenticated user's account details and role.
 *
 * Access: Authenticated users only
 * Headers: Cookie (session ID)
 * Response: 200 OK with { user: { id, username, email, fullName, access } }
 */
userRouter.get("/me", requireAuthentication, getCurrentUser);

/**
 * GET /api/users/auth/google
 * Initiate Google OAuth 2.0 authentication redirect flow.
 *
 * Access: Public (returns 503 if Google OAuth credentials are not configured)
 * Response: Redirects user to Google OAuth consent screen
 */
userRouter.get("/auth/google", (req, res, next) => {
  if (!isGoogleAuthConfigured) {
    res.status(503).json({ message: "Google sign-in is not configured" });
    return;
  }

  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })(req, res, next);
});

/**
 * GET /api/users/auth/google/callback
 * Google OAuth 2.0 callback endpoint. Completes OAuth exchange, establishes
 * a session cookie, and redirects the user to the client application.
 *
 * Access: Public (called by Google OAuth)
 * Response: Redirects to `${CLIENT_ORIGIN}/?auth=success` or failure redirect
 */
userRouter.get(
  "/auth/google/callback",
  (req, res, next) => {
    if (!isGoogleAuthConfigured) {
      res.status(503).json({ message: "Google sign-in is not configured" });
      return;
    }

    passport.authenticate("google", {
      failureRedirect: `${process.env.CLIENT_ORIGIN ?? "http://localhost:5173"}/?auth=google-error`,
      session: false,
    })(req, res, next);
  },
  googleCallback
);

export default userRouter;
