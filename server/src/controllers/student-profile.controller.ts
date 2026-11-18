import type { Request, Response } from "express";
import {
  createStudentProfile,
  deleteStudentProfile,
  getStudentProfile,
  updateStudentProfile,
} from "../services/student-profile.service.js";
import {
  getRequestBody,
  pickAllowedFields,
} from "../utils/request-validation.js";

const studentProfileFields = [
  "collegeName",
  "yearStart",
  "yearEnd",
  "course",
  "batch",
  "resume",
  "experienceDocuments",
  "experienceSummary",
  "payment",
] as const;

function getUserId(req: Request): string {
  return req.user!.id;
}

export async function getMyStudentProfile(req: Request, res: Response) {
  const profile = await getStudentProfile(getUserId(req));
  res.status(200).json({ profile });
}

export async function createMyStudentProfile(req: Request, res: Response) {
  const profileData = pickAllowedFields(
    getRequestBody(req.body),
    studentProfileFields
  );
  const profile = await createStudentProfile(getUserId(req), profileData);
  res.status(201).json({ profile });
}

export async function updateMyStudentProfile(req: Request, res: Response) {
  const profileData = pickAllowedFields(
    getRequestBody(req.body),
    studentProfileFields
  );
  const profile = await updateStudentProfile(getUserId(req), profileData);
  res.status(200).json({ profile });
}

export async function deleteMyStudentProfile(req: Request, res: Response) {
  await deleteStudentProfile(getUserId(req));
  res.status(200).json({ message: "Student profile deleted" });
}