import type { Request, Response, NextFunction } from "express";
import { ApiError } from "../services/api-error.service.js";

export function requireAuthentication(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.isAuthenticated()) {
    res.status(401).json({ message: "Authentication is required" });
    return;
  }

  next();
}

export function requireRole(...roles: Array<"admin" | "student" | "mentor">) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.isAuthenticated() || !req.user) {
      next(new ApiError("Authentication is required", 401));
      return;
    }

    if (!roles.some((role) => req.user.access.includes(role))) {
      next(new ApiError("You are not allowed to perform this action", 403));
      return;
    }

    next();
  };
}
