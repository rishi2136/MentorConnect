import {
  Schema,
  model,
  type InferSchemaType,
} from "mongoose";
import { UserModel } from "./user.model.js";

const fileSchema = new Schema(
  {
    url: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2048,
    },
    storageKey: {
      type: String,
      required: true,
      trim: true,
      maxlength: 512,
    },
    mimeType: {
      type: String,
      required: true,
      enum: [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp",
      ],
    },
    size: {
      type: Number,
      required: true,
      min: 1,
      max: 5 * 1024 * 1024,
      validate: {
        validator: Number.isInteger,
        message: "File size must be an integer",
      },
    },
  },
  { _id: false }
);

const paymentSchema = new Schema(
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
    upiQrImage: {
      type: fileSchema,
      required: false,
    },
    providerReference: {
      type: String,
      trim: true,
      maxlength: 200,
    },
  },
  { _id: false }
);

const studentProfileSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: UserModel.modelName,
      required: true,
      unique: true,
    },

    collegeName: {
      type: String,
      required: [true, "College name is required"],
      trim: true,
      minlength: 2,
      maxlength: 150,
    },

    yearStart: {
      type: Number,
      required: [true, "Start year is required"],
      min: [2000, "Start year is invalid"],
      max: [
        new Date().getFullYear() + 10,
        "Start year is too far in the future",
      ],
      validate: {
        validator: Number.isInteger,
        message: "Start year must be an integer",
      },
    },

    yearEnd: {
      type: Number,
      required: [true, "End year is required"],
      min: [2000, "End year is invalid"],
      max: [
        new Date().getFullYear() + 15,
        "End year is too far in the future",
      ],
      validate: [
        {
          validator: Number.isInteger,
          message: "End year must be an integer",
        },
        {
          validator: function (this: { yearStart: number }, value: number) {
            return value >= this.yearStart;
          },
          message: "End year must be on or after start year",
        },
      ],
    },

    course: {
      type: String,
      required: [true, "Course is required"],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    batch: {
      type: String,
      required: [true, "Batch is required"],
      trim: true,
      minlength: 1,
      maxlength: 50,
    },

    resume: {
      type: fileSchema,
      required: false,
    },

    experienceDocuments: {
      type: [fileSchema],
      default: [],
      validate: {
        validator: (files: unknown[]) => files.length <= 5,
        message: "A maximum of 5 experience documents is allowed",
      },
    },

    experienceSummary: {
      type: String,
      trim: true,
      maxlength: [500, "Experience summary is too long"],
      required: false,
    },

    payment: {
      type: paymentSchema,
      required: false,
      default: undefined,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    strict: "throw",
  }
);

export type StudentProfile = InferSchemaType<typeof studentProfileSchema>;

export const StudentProfileModel = model(
  "StudentProfile",
  studentProfileSchema
);
