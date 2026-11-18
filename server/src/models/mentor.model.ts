import {
  Schema,
  model,
  type InferSchemaType,
} from "mongoose";
import { UserModel } from "./user.model.js";
import { StudentProfileModel } from "./student.model.js";
import { DEFAULT_TIME_ZONE } from "../utils/timezone.js";

const paymentInfoSchema = new Schema(
  {
    upiId: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 100,
      match: [
        /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/,
        "Invalid UPI ID",
      ],
    },
    providerReference: {
      type: String,
      trim: true,
      maxlength: 200,
    },
  },
  { _id: false }
);

const availabilitySchema = new Schema(
  {
    dayOfWeek: {
      type: Number,
      required: true,
      min: 0,
      max: 6,
      validate: Number.isInteger,
    },
    startTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):[0-5]\d$/,
    },
    endTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):[0-5]\d$/,
      validate: {
        validator: function (this: { startTime: string }, value: string) {
          return value > this.startTime;
        },
        message: "Availability end time must follow its start time",
      },
    },
  },
  { _id: false }
);

const mentorProfileSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: UserModel.modelName,
      required: true,
      unique: true,
    },

    yearsOfExperience: {
      type: Number,
      required: [true, "Years of experience is required"],
      min: [0, "Years of experience cannot be negative"],
      validate: {
        validator: Number.isInteger,
        message: "Years of experience must be an integer",
      },
    },

    aboutMe: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
      required: false,
    },

    expertise: {
      type: [String],
      default: [],
      validate: {
        validator: (values: string[]) => values.every((value) => value.trim().length > 0),
        message: "Expertise entries cannot be empty",
      },
    },

    languages: {
      type: [String],
      default: [],
      validate: {
        validator: (values: string[]) => values.every((value) => value.trim().length > 0),
        message: "Language entries cannot be empty",
      },
    },

    skills: {
      type: [String],
      default: [],
      validate: {
        validator: (values: string[]) => values.every((value) => value.trim().length > 0),
        message: "Skill entries cannot be empty",
      },
    },

    availability: {
      type: [availabilitySchema],
      default: [],
    },

    timezone: {
      type: String,
      trim: true,
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
        message: "Timezone must be a valid IANA timezone",
      },
    },

    rating: {
      type: Number,
      default: 0,
      min: [0, "Rating cannot be below 0"],
      max: [5, "Rating cannot exceed 5"],
    },

    ratingCount: {
      type: Number,
      default: 0,
      min: [0, "Rating count cannot be negative"],
      validate: Number.isInteger,
    },

    charges: {
      type: Number,
      min: [0, "Charges cannot be negative"],
      required: false,
    },

    isCharged: {
      type: String,
      enum: ["enabled", "disabled"],
      default: "enabled",
      required: true,
    },

    requestedQueue: {
      type: [{ type: Schema.Types.ObjectId, ref: StudentProfileModel.modelName }],
      default: [],
    },

    paymentInfo: {
      type: paymentInfoSchema,
      required: false,
      default: undefined,
    },

    sessionCount: {
      type: Number,
      default: 0,
      min: [0, "Session count cannot be negative"],
      validate: {
        validator: Number.isInteger,
        message: "Session count must be an integer",
      },
    },

    isAvailable: {
      type: Boolean,
      default: true,
      required: true,
    },

    isFreeSessionEnabled: {
      type: Boolean,
      default: false,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    strict: "throw",
  }
);

export type MentorProfile = InferSchemaType<typeof mentorProfileSchema>;

export const MentorProfileModel = model(
  "MentorProfile",
  mentorProfileSchema
);
