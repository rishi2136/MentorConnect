import { StudentProfileModel } from "../models/student.model.js";
import { AudioMeetSessionModel } from "../models/audio-meet-session.model.js";
import { ApiError } from "./api-error.service.js";

export async function getStudentProfile(userId: string) {
  const profile = await StudentProfileModel.findOne({ userId });
  if (!profile) throw new ApiError("Student profile was not found", 404);
  return profile;
}

export async function createStudentProfile(
  userId: string,
  profileData: Record<string, unknown>
) {
  if (await StudentProfileModel.exists({ userId })) {
    throw new ApiError("A student profile already exists", 409);
  }

  return StudentProfileModel.create({ userId, ...profileData });
}

export async function updateStudentProfile(
  userId: string,
  profileData: Record<string, unknown>
) {
  if (Object.keys(profileData).length === 0) {
    throw new ApiError("At least one profile field is required", 400);
  }

  const profile = await getStudentProfile(userId);
  profile.set(profileData);
  await profile.save();
  return profile;
}

export async function deleteStudentProfile(userId: string) {
  const profile = await getStudentProfile(userId);
  if (await AudioMeetSessionModel.exists({ studentId: profile._id })) {
    throw new ApiError("Student profile cannot be deleted while sessions reference it", 409);
  }
  await profile.deleteOne();
}