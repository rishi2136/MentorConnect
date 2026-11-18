import type { ErrorRequestHandler } from "express";
import { Error as MongooseError } from "mongoose";
import { ApiError } from "../services/api-error.service.js";
import { AuthenticationError } from "../services/user.service.js";

export const errorMiddleware: ErrorRequestHandler = (
  error: unknown,
  _req,
  res,
  _next
) => {
  if (error instanceof ApiError || error instanceof AuthenticationError) {
    res.status(error.statusCode).json({ message: error.message });
    return;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  ) {
    res
      .status(409)
      .json({ message: "An account with these details already exists" });
    return;
  }

  // Mongoose throws this when a document fails schema validation (for example, a required field is missing).
  if (error instanceof MongooseError.ValidationError) {
    res.status(400).json({
      message: "Request validation failed",
      details: Object.values(error.errors).map((validationError) => ({
        field: validationError.path,
        message: validationError.message,
      })),
    });
    return;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    error.status === 400
  ) {
    res.status(400).json({ message: "Invalid JSON request body" });
    return;
  }

  if (error instanceof Error) {
    console.error(error);
  } else {
    console.error("An unknown server error occurred");
  }

  res.status(500).json({ message: "An unexpected server error occurred" });
};