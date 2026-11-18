import type { Request, Response } from "express";
import {
  createMentorProfile,
  deleteMentorProfile,
  getMentorProfile,
  getPublicMentorProfile,
  searchMentors as findMentors,
  setFreeSessionEnabled,
  updateMentorProfile,
} from "../services/mentor-profile.service.js";
import { ApiError } from "../services/api-error.service.js";
import {
  getRequestBody,
  parseOptionalNumber,
  parseQueryList,
  pickAllowedFields,
} from "../utils/request-validation.js";

const mentorProfileFields = [
  "yearsOfExperience",
  "aboutMe",
  "expertise",
  "languages",
  "skills",
  "availability",
  "timezone",
  "charges",
  "isCharged",
  "paymentInfo",
  "isAvailable",
] as const;

function getUserId(req: Request): string {
  return req.user!.id;
}

function queryString(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    throw new ApiError(`${field} must be a single text value`, 400);
  }
  return value.trim();
}

function boundedInteger(
  value: number | undefined,
  field: string,
  minimum: number,
  maximum: number
): number | undefined {
  if (value === undefined) return undefined;
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new ApiError(`${field} must be an integer from ${minimum} to ${maximum}`, 400);
  }
  return value;
}

export async function getMyMentorProfile(req: Request, res: Response) {
  const profile = await getMentorProfile(getUserId(req));
  res.status(200).json({ profile });
}

export async function createMyMentorProfile(req: Request, res: Response) {
  const profileData = pickAllowedFields(
    getRequestBody(req.body),
    mentorProfileFields
  );
  const profile = await createMentorProfile(getUserId(req), profileData);
  res.status(201).json({ profile });
}

export async function updateMyMentorProfile(req: Request, res: Response) {
  const profileData = pickAllowedFields(
    getRequestBody(req.body),
    mentorProfileFields
  );
  const profile = await updateMentorProfile(getUserId(req), profileData);
  res.status(200).json({ profile });
}

export async function deleteMyMentorProfile(req: Request, res: Response) {
  await deleteMentorProfile(getUserId(req));
  res.status(200).json({ message: "Mentor profile deleted" });
}

export async function changeFreeSessionSetting(req: Request, res: Response) {
  const body = getRequestBody(req.body);
  if (typeof body.enabled !== "boolean") {
    throw new ApiError("enabled must be a boolean", 400);
  }

  const profile = await setFreeSessionEnabled(getUserId(req), body.enabled);
  res.status(200).json({
    isFreeSessionEnabled: profile.isFreeSessionEnabled,
  });
}

export async function searchMentors(req: Request, res: Response) {
  const minExperience = boundedInteger(
    parseOptionalNumber(req.query.minExperience, "minExperience"),
    "minExperience",
    0,
    80
  );
  const maxExperience = boundedInteger(
    parseOptionalNumber(req.query.maxExperience, "maxExperience"),
    "maxExperience",
    0,
    80
  );
  const minPrice = parseOptionalNumber(req.query.minPrice, "minPrice");
  const maxPrice = parseOptionalNumber(req.query.maxPrice, "maxPrice");
  const minRating = parseOptionalNumber(req.query.minRating, "minRating");
  const dayOfWeek = boundedInteger(
    parseOptionalNumber(req.query.dayOfWeek, "dayOfWeek"),
    "dayOfWeek",
    0,
    6
  );
  const page = boundedInteger(
    parseOptionalNumber(req.query.page, "page"),
    "page",
    1,
    100000
  ) ?? 1;
  const limit = boundedInteger(
    parseOptionalNumber(req.query.limit, "limit"),
    "limit",
    1,
    100
  ) ?? 20;
  const availableFrom = queryString(req.query.availableFrom, "availableFrom");
  const availableTo = queryString(req.query.availableTo, "availableTo");

  if (minPrice !== undefined && minPrice < 0 || maxPrice !== undefined && maxPrice < 0) {
    throw new ApiError("Price filters cannot be negative", 400);
  }
  if (minRating !== undefined && (minRating < 0 || minRating > 5)) {
    throw new ApiError("minRating must be between 0 and 5", 400);
  }
  if (minExperience !== undefined && maxExperience !== undefined && minExperience > maxExperience) {
    throw new ApiError("minExperience cannot exceed maxExperience", 400);
  }
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    throw new ApiError("minPrice cannot exceed maxPrice", 400);
  }

  for (const [field, value] of [["availableFrom", availableFrom], ["availableTo", availableTo]] as const) {
    if (value !== undefined && !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
      throw new ApiError(`${field} must use HH:mm format`, 400);
    }
  }

  const result = await findMentors({
    query: queryString(req.query.q, "q"),
    languages: parseQueryList(req.query.language, "language"),
    domains: parseQueryList(req.query.domain, "domain"),
    minExperience,
    maxExperience,
    minPrice,
    maxPrice,
    minRating,
    dayOfWeek,
    availableFrom,
    availableTo,
    page,
    limit,
  });
  res.status(200).json(result);
}

export async function getMentorById(req: Request, res: Response) {
  const profileId = req.params.mentorProfileId;
  const profile = await getPublicMentorProfile(
    Array.isArray(profileId) ? profileId[0]! : profileId!
  );
  res.status(200).json({ profile });
}