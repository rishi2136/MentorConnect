import { Schema, model, type InferSchemaType } from "mongoose";
import { DEFAULT_TIME_ZONE } from "../utils/timezone.js";
import { MentorProfileModel } from "./mentor.model.js";
import { StudentProfileModel } from "./student.model.js";
import { UserModel } from "./user.model.js";

const audioMeetSessionSchema = new Schema(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: StudentProfileModel.modelName,
      required: true,
      index: true,
    },
    mentorId: {
      type: Schema.Types.ObjectId,
      ref: MentorProfileModel.modelName,
      required: true,
      index: true,
    },
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: UserModel.modelName,
      required: true,
    },
    topic: {
      type: String,
      required: [true, "Session topic is required"],
      trim: true,
      minlength: 2,
      maxlength: 160,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },
    scheduledAt: {
      type: Date,
      required: [true, "A session start time is required"],
      validate: {
        validator: (value: Date) => value.getTime() > Date.now(),
        message: "A session must be scheduled in the future",
      },
    },
    scheduledTimezone: {
      type: String,
      default: DEFAULT_TIME_ZONE,
      maxlength: 100,
      validate: {
        validator: (value: string) => {
          try {
            new Intl.DateTimeFormat("en-US", { timeZone: value });
            return true;
          } catch {
            return false;
          }
        },
        message: "Scheduled timezone must be a valid IANA timezone",
      },
    },
    durationMinutes: {
      type: Number,
      required: true,
      min: 15,
      max: 180,
      validate: Number.isInteger,
      default: 30,
    },
    mode: {
      type: String,
      enum: ["audio", "video"],
      default: "audio",
      required: true,
    },
    status: {
      type: String,
      enum: ["requested", "accepted", "rejected", "cancelled", "completed"],
      default: "requested",
      required: true,
      index: true,
    },
    price: {
      type: Number,
      min: 0,
      required: true,
    },
    isFreeSession: {
      type: Boolean,
      default: false,
      required: true,
    },
  },
  { timestamps: true, versionKey: false, strict: "throw" }
);

audioMeetSessionSchema.index({ mentorId: 1, scheduledAt: 1, status: 1 });
audioMeetSessionSchema.index({ studentId: 1, scheduledAt: -1 });

export type AudioMeetSession = InferSchemaType<typeof audioMeetSessionSchema>;

export const AudioMeetSessionModel = model(
  "AudioMeetSession",
  audioMeetSessionSchema
);