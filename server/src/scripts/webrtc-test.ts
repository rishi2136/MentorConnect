import "dotenv/config";
import { randomBytes } from "node:crypto";
import mongoose from "mongoose";
import { connectDB, mongoUri } from "../config/db.js";
import { AudioMeetSessionModel } from "../models/audio-meet-session.model.js";
import { ChatMessageModel } from "../models/chat-message.model.js";
import { MentorProfileModel } from "../models/mentor.model.js";
import { StudentProfileModel } from "../models/student.model.js";
import { UserModel } from "../models/user.model.js";
import { createUser } from "../services/user.service.js";

function getTestEmailPattern(runId?: string) {
  return runId
    ? new RegExp(
        `^webrtc-test-${runId}-(student|mentor)@local\\.test$`
      )
    : /^webrtc-test-[a-z0-9-]+-(student|mentor)@local\.test$/;
}

function assertLocalDevelopmentDatabase() {
  let hostname: string;
  try {
    hostname = new URL(mongoUri).hostname;
  } catch {
    throw new Error(
      "The WebRTC test helper requires a valid local MongoDB connection URI."
    );
  }

  if (
    process.env.NODE_ENV === "production" ||
    !["localhost", "127.0.0.1", "::1"].includes(hostname)
  ) {
    throw new Error(
      "The WebRTC test helper only runs against a local, non-production MongoDB database."
    );
  }
}

async function removeTestData(runId?: string) {
  const users = await UserModel.find({ email: getTestEmailPattern(runId) })
    .select("_id")
    .lean();
  const userIds = users.map((user) => user._id);
  const [students, mentors] = await Promise.all([
    StudentProfileModel.find({ userId: { $in: userIds } })
      .select("_id")
      .lean(),
    MentorProfileModel.find({ userId: { $in: userIds } })
      .select("_id")
      .lean(),
  ]);
  const studentIds = students.map((profile) => profile._id);
  const mentorIds = mentors.map((profile) => profile._id);
  const sessions = await AudioMeetSessionModel.find({
    $or: [
      { studentId: { $in: studentIds } },
      { mentorId: { $in: mentorIds } },
    ],
  })
    .select("_id")
    .lean();
  const sessionIds = sessions.map((session) => session._id);

  await Promise.all([
    ChatMessageModel.deleteMany({ sessionId: { $in: sessionIds } }),
    AudioMeetSessionModel.deleteMany({ _id: { $in: sessionIds } }),
    StudentProfileModel.deleteMany({ _id: { $in: studentIds } }),
    MentorProfileModel.deleteMany({ _id: { $in: mentorIds } }),
  ]);
  await UserModel.deleteMany({ _id: { $in: userIds } });
  console.info(`Removed ${users.length} WebRTC test account(s) and their test data.`);
}

async function createTestCall() {
  const runId = `${Date.now()}-${randomBytes(3).toString("hex")}`;
  const password = `WebRTC-${randomBytes(12).toString("base64url")}`;
  try {
    const student = await createUser({
      email: `webrtc-test-${runId}-student@local.test`,
      password,
      fullName: "WebRTC Test Student",
      access: "student",
    });
    const mentor = await createUser({
      email: `webrtc-test-${runId}-mentor@local.test`,
      password,
      fullName: "WebRTC Test Mentor",
      access: "mentor",
    });
    const [studentProfile, mentorProfile] = await Promise.all([
      StudentProfileModel.create({
        userId: student._id,
        collegeName: "WebRTC Test College",
        yearStart: new Date().getFullYear(),
        yearEnd: new Date().getFullYear() + 1,
        course: "WebRTC Test Course",
        batch: "Test",
      }),
      MentorProfileModel.create({
        userId: mentor._id,
        yearsOfExperience: 1,
        expertise: ["WebRTC Testing"],
        timezone: "UTC",
        isAvailable: true,
        isFreeSessionEnabled: true,
        charges: 0,
      }),
    ]);

    const scheduledAt = new Date(Date.now() + 4 * 60_000);
    const session = await AudioMeetSessionModel.create({
      studentId: studentProfile._id,
      mentorId: mentorProfile._id,
      requestedBy: student._id,
      topic: "WebRTC camera and microphone test",
      notes: "Temporary local test session.",
      scheduledAt,
      scheduledTimezone: "UTC",
      durationMinutes: 30,
      mode: "video",
      status: "accepted",
      price: 0,
      isFreeSession: true,
    });

    console.info("\nLocal WebRTC test call is ready.");
    console.info(`Student: ${student.email}`);
    console.info(`Mentor:  ${mentor.email}`);
    console.info(`Password (both accounts): ${password}`);
    console.info(`Call URL: http://localhost:5173/call/${session._id}`);
    console.info(
      `The call opens now and remains available until ${new Date(
        scheduledAt.getTime() + 30 * 60_000
      ).toISOString()} (UTC).`
    );
    console.info(
      "\nSign in as the student in one browser and the mentor in another, then open the call URL in both."
    );
  } catch (error) {
    await removeTestData(runId);
    throw error;
  }
}

async function main() {
  assertLocalDevelopmentDatabase();
  await connectDB();
  const command = process.argv[2];

  if (command === "setup") {
    await createTestCall();
  } else if (command === "cleanup") {
    await removeTestData();
  } else {
    throw new Error("Usage: npm run test:webrtc -- <setup|cleanup>");
  }
}

try {
  await main();
} finally {
  await mongoose.disconnect();
}
