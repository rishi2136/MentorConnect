import { ApiError } from "../services/api-error.service.js";

export function getRequestBody(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ApiError("A JSON request body is required", 400);
  }

  return value as Record<string, unknown>;
}

export function requiredString(
  body: Record<string, unknown>,
  field: string
): string {
  const value = body[field];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ApiError(`${field} is required`, 400);
  }

  return value.trim();
}

export function pickAllowedFields(
  body: Record<string, unknown>,
  allowedFields: readonly string[]
): Record<string, unknown> {
  const unknownFields = Object.keys(body).filter(
    (field) => !allowedFields.includes(field)
  );
  if (unknownFields.length > 0) {
    throw new ApiError(`Unsupported field: ${unknownFields[0]}`, 400);
  }

  return Object.fromEntries(
    Object.entries(body).filter(([, value]) => value !== undefined)
  );
}

export function parseOptionalNumber(
  value: unknown,
  field: string
): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.trim() === "") {
    throw new ApiError(`${field} must be a number`, 400);
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new ApiError(`${field} must be a number`, 400);
  }

  return parsed;
}

export function parseQueryList(value: unknown, field: string): string[] {
  if (value === undefined) return [];
  const entries = Array.isArray(value) ? value : [value];
  if (!entries.every((entry) => typeof entry === "string")) {
    throw new ApiError(`${field} must contain text values`, 400);
  }

  return (entries as string[])
    .flatMap((entry) => entry.split(","))
    .map((entry) => entry.trim())
    .filter(Boolean);
}