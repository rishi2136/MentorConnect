import express from "express";
import cors from "cors";
import morgan from "morgan";
import session from "express-session";
import MongoStore from "connect-mongo";
import passport from "./config/passport.js";
import userRouter from "./routes/user.route.js";
import mentorProfileRouter from "./routes/mentor-profile.route.js";
import studentProfileRouter from "./routes/student-profile.route.js";
import audioMeetSessionRouter from "./routes/audio-meet-session.route.js";
import { errorMiddleware } from "./middleware/error.middleware.js";
import { mongoUri } from "./config/db.js";

const app = express();
const isProduction = process.env.NODE_ENV === "production";
const sessionSecret = process.env.SESSION_SECRET;
const clientOrigin = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";
const sessionCookieName =
  process.env.SESSION_COOKIE_NAME ?? "mentorconnect.sid";

if (!sessionSecret || sessionSecret.length < 32) {
  throw new Error(
    "SESSION_SECRET must be configured with at least 32 characters"
  );
}

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(
  cors({
    origin: clientOrigin,
    credentials: true,
  })
);
// HTTP request logging middleware (tracks incoming API calls and response times)
app.use(morgan("dev"));
app.use(express.json({ limit: "10kb" }));
export const sessionMiddleware = session({
  name: sessionCookieName,
  secret: sessionSecret,
  store: MongoStore.create({
    mongoUrl: mongoUri,
    collectionName: "sessions",
    ttl: 7 * 24 * 60 * 60,
  }),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
     secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  },
});
app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());

/**
 * Health check / Root endpoint
 * GET /
 * Public endpoint to verify that the API server is up and responsive.
 */
app.get("/", (_req, res) => {
  res.json({
    message: "MentorConnect API is running",
  });
});

// ==========================================
// API Route Mounts (/api/*)
// ==========================================

/**
 * User & Authentication routes
 * Handles registration, login, logout, current session lookup, and Google OAuth.
 */
app.use("/api/users", userRouter);
/**
 * Student profile routes
 * Handles CRUD operations for the authenticated student's profile.
 */
app.use("/api/students", studentProfileRouter);
/**
 * Mentor profile & search routes
 * Handles public mentor directory search, public profile lookup,
 * and authenticated mentor profile management.
 */
app.use("/api/mentors", mentorProfileRouter);
/**
 * Audio-meet session booking routes
 * Handles booking requests, participant session listing, session details,
 * and lifecycle status transitions (requested -> accepted/rejected/cancelled/completed).
 */
app.use("/api/audio-meet-sessions", audioMeetSessionRouter);
app.use(errorMiddleware);

export default app;
