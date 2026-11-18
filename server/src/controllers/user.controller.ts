

import type { Request, Response } from "express";
import {
  AuthenticationError,
  authenticateUser,
  createUser,
} from "../services/user.service.js";
import { createDefaultMentorProfile } from "../services/mentor-profile.service.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null &&  !Array.isArray(value);
}

function requiredString(
  body: Record<string, unknown>,
  field: string
): string {
  const value = body[field];

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new AuthenticationError(`${field} is required`, 400);
  }

  return value.trim();
}

function getBody(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new AuthenticationError("A JSON request body is required", 400);
  }

  return value;
}

function getPublicUser(user: Express.User) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    fullName: user.fullName,
    access: user.access,
  };
}

function establishSession(
  req: Request,
  user: Express.User
): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.regenerate((regenerateError) => {
      if (regenerateError) {
        reject(regenerateError);
        return;
      }

      req.logIn(user, (loginError) => {
        if (loginError) {
          reject(loginError);
          return;
        }

        resolve();
      });
    });
  });
}

export async function signup(req: Request, res: Response) {
  const body = getBody(req.body);
  const email = requiredString(body, "email");
  const password = requiredString(body, "password");
  const fullName = requiredString(body, "fullName");
  const requestedRole = body.access ?? "student";

  if (requestedRole !== "student" && requestedRole !== "mentor") {
    throw new AuthenticationError(
      "Public signup only supports student or mentor accounts",
      400
    );
  }

  const user = await createUser({
    email,
    password,
    fullName,
    access: requestedRole,
  });

  // Keep the mentor account and its required profile consistent at signup.
  if (requestedRole === "mentor") {
    try {
      await createDefaultMentorProfile(String(user._id));
    } catch (profileError) {
      try {
        await user.deleteOne();
      } catch (rollbackError) {
        throw new AggregateError(
          [profileError, rollbackError],
          "Mentor profile creation failed and the new account could not be removed"
        );
      }
      throw profileError;
    }
  }

  await establishSession(req, user);
  res.status(201).json({ user: getPublicUser(user) });
}

export async function login(req: Request, res: Response) {
  const body = getBody(req.body);
  const email = requiredString(body, "email");
  const password = requiredString(body, "password");
  const user = await authenticateUser(email, password);

  await establishSession(req, user);
  res.status(200).json({ user: getPublicUser(user) });
}

export function logout(
  req: Request,
  res: Response,
  next: (error?: unknown) => void
) {
  req.logout((logoutError) => {
    if (logoutError) {
      next(logoutError);
      return;
    }

    req.session.destroy((destroyError) => {
      if (destroyError) {
        next(destroyError);
        return;
      }

      res.clearCookie(process.env.SESSION_COOKIE_NAME ?? "mentorconnect.sid", {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
      });
      res.status(200).json({ message: "Logged out successfully" });
    });
  });
}

export async function googleCallback(req: Request, res: Response) {
  if (!req.user) {
    throw new AuthenticationError("Google sign-in failed", 401);
  }

  const user = req.user;
  await establishSession(req, user);

  const clientOrigin =
    process.env.CLIENT_ORIGIN ?? "http://localhost:5173";
  res.redirect(`${clientOrigin}/?auth=success`);
}

export function getCurrentUser(req: Request, res: Response) {
  if (!req.user) {
    throw new AuthenticationError("Authentication is required", 401);
  }

  res.status(200).json({ user: getPublicUser(req.user) });
}
