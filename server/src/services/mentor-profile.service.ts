import { isValidObjectId, type Types } from "mongoose";
import { MentorProfileModel } from "../models/mentor.model.js";
import { AudioMeetSessionModel } from "../models/audio-meet-session.model.js";
import { UserModel } from "../models/user.model.js";
import { ApiError } from "./api-error.service.js";
import { DEFAULT_TIME_ZONE } from "../utils/timezone.js";

const publicMentorFields =
  "userId yearsOfExperience aboutMe expertise languages skills availability timezone charges isCharged sessionCount isAvailable isFreeSessionEnabled rating ratingCount";

function validateProfileTimezone(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    throw new ApiError("timezone must be a valid IANA timezone", 400);
  }
  const timezone = value.trim();
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
  } catch (error) {
    if (error instanceof RangeError) {
      throw new ApiError("timezone must be a valid IANA timezone", 400);
    }
    throw error;
  }
  return timezone;
}

export async function getMentorProfile(userId: string) {
  const profile = await MentorProfileModel.findOne({ userId });
  if (!profile) throw new ApiError("Mentor profile was not found", 404);
  return profile;
}

export async function createMentorProfile(
  userId: string,
  profileData: Record<string, unknown>
) {
  if (await MentorProfileModel.exists({ userId })) {
    throw new ApiError("A mentor profile already exists", 409);
  }

  const timezone =
    profileData.timezone === undefined
      ? DEFAULT_TIME_ZONE
      : validateProfileTimezone(profileData.timezone);
  return MentorProfileModel.create({
    userId,
    ...profileData,
    timezone,
  });
}

function defaultMentorProfile(
  userId: string | Types.ObjectId
) {
  return {
    userId,
    yearsOfExperience: 0,
    timezone: DEFAULT_TIME_ZONE,
    isFreeSessionEnabled: false,
    isAvailable: false,
  };
}

export async function createDefaultMentorProfile(
  userId: string
) {
  return MentorProfileModel.create(defaultMentorProfile(userId));
}

export async function backfillMissingMentorProfiles() {
  const mentorUsers = await UserModel.find({ access: "mentor" })
    .select("_id")
    .lean();
  if (mentorUsers.length === 0) return 0;

  const existingUserIds = new Set(
    (
      await MentorProfileModel.distinct("userId", {
        userId: { $in: mentorUsers.map((user) => user._id) },
      })
    ).map(String)
  );
  const missingProfiles = mentorUsers
    .filter((user) => !existingUserIds.has(String(user._id)))
    .map((user) => defaultMentorProfile(user._id));

  if (missingProfiles.length > 0) {
    await MentorProfileModel.insertMany(missingProfiles);
  }
  return missingProfiles.length;
}

export async function updateMentorProfile(
  userId: string,
  profileData: Record<string, unknown>
) {
  if (Object.keys(profileData).length === 0) {
    throw new ApiError("At least one profile field is required", 400);
  }

  const profile = await getMentorProfile(userId);
  const updateData = { ...profileData };
  if (updateData.timezone !== undefined) {
    updateData.timezone = validateProfileTimezone(updateData.timezone);
  }
  profile.set(updateData);
  await profile.save();
  return profile;
}

export async function deleteMentorProfile(userId: string) {
  const profile = await getMentorProfile(userId);
  if (await AudioMeetSessionModel.exists({ mentorId: profile._id })) {
    throw new ApiError("Mentor profile cannot be deleted while sessions reference it", 409);
  }
  await profile.deleteOne();
}

export async function setFreeSessionEnabled(userId: string, enabled: boolean) {
  const profile = await getMentorProfile(userId);
  profile.isFreeSessionEnabled = enabled;
  await profile.save();
  return profile;
}

export type MentorSearchFilters = {
  query?: string | undefined;
  languages: string[];
  domains: string[];
  minExperience?: number | undefined;
  maxExperience?: number | undefined;
  minPrice?: number | undefined;
  maxPrice?: number | undefined;
  minRating?: number | undefined;
  dayOfWeek?: number | undefined;
  availableFrom?: string | undefined;
  availableTo?: string | undefined;
  page: number;
  limit: number;
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function searchMentors(filters: MentorSearchFilters) {
  const clauses: Record<string, unknown>[] = [{ isAvailable: true }];

  if (filters.minExperience !== undefined || filters.maxExperience !== undefined) {
    const range: Record<string, number> = {};
    if (filters.minExperience !== undefined) range.$gte = filters.minExperience;
    if (filters.maxExperience !== undefined) range.$lte = filters.maxExperience;
    clauses.push({ yearsOfExperience: range });
  }

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    const range: Record<string, number> = {};
    if (filters.minPrice !== undefined) range.$gte = filters.minPrice;
    if (filters.maxPrice !== undefined) range.$lte = filters.maxPrice;
    clauses.push({ charges: range });
  }

  if (filters.minRating !== undefined) {
    clauses.push({ rating: { $gte: filters.minRating } });
  }

  if (filters.languages.length > 0) {
    clauses.push({ languages: { $in: filters.languages.map((value) => new RegExp(`^${escapeRegExp(value)}$`, "i")) } });
  }

  if (filters.domains.length > 0) {
    clauses.push({ expertise: { $in: filters.domains.map((value) => new RegExp(escapeRegExp(value), "i")) } });
  }

  if (filters.dayOfWeek !== undefined) {
    const availability: Record<string, unknown> = {
      dayOfWeek: filters.dayOfWeek,
    };
    if (filters.availableFrom) availability.startTime = { $lte: filters.availableFrom };
    if (filters.availableTo) availability.endTime = { $gte: filters.availableTo };
    clauses.push({ availability: { $elemMatch: availability } });
  }

  if (filters.query) {
    const queryPattern = new RegExp(escapeRegExp(filters.query), "i");
    const matchingUsers = await UserModel.find({ fullName: queryPattern })
      .select("_id")
      .lean();
    clauses.push({
      $or: [
        { userId: { $in: matchingUsers.map((user) => user._id) } },
        { aboutMe: queryPattern },
        { expertise: queryPattern },
        { skills: queryPattern },
        { languages: queryPattern },
      ],
    });
  }

  const filter = clauses.length === 1 ? clauses[0] : { $and: clauses };
  const skip = (filters.page - 1) * filters.limit;
  const [profiles, total] = await Promise.all([
    MentorProfileModel.find(filter)
      .select(publicMentorFields)
      .populate("userId", "fullName username profilePic")
      .sort({ rating: -1, ratingCount: -1, yearsOfExperience: -1 })
      .skip(skip)
      .limit(filters.limit)
      .lean(),
    MentorProfileModel.countDocuments(filter),
  ]);

  return {
    profiles,
    page: filters.page,
    limit: filters.limit,
    total,
  };
}

export async function getPublicMentorProfile(profileId: string) {
  if (!isValidObjectId(profileId)) {
    throw new ApiError("Mentor profile ID is invalid", 400);
  }

  const profile = await MentorProfileModel.findById(profileId)
    .select(publicMentorFields)
    .populate("userId", "fullName username profilePic")
    .lean();
  if (!profile) throw new ApiError("Mentor profile was not found", 404);
  return profile;
}