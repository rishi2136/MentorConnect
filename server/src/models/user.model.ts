import {
  Schema,
  model,
  type InferSchemaType,
} from "mongoose";
import bcrypt from "bcryptjs";

export const USER_ROLES = [
  "admin",
  "student",
  "mentor",
] as const;

const profilePictureSchema = new Schema(
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
      enum: ["image/jpeg", "image/png", "image/webp"],
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

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [3, "Username must have at least 3 characters"],
      maxlength: [30, "Username cannot exceed 30 characters"],
      match: [
        /^[a-z0-9_]+$/,
        "Username may contain only letters, numbers, and underscores",
      ],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: [254, "Email cannot exceed 254 characters"],
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "A valid email address is required",
      ],
    },

    password: {
      type: String,
      required: false,
      minlength: [8, "Password must have at least 8 characters"],
      select: false,
    },

    googleId: {
      type: String,
      unique: true,
      sparse: true,
      select: false,
    },

    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      minlength: [2, "Full name must have at least 2 characters"],
      maxlength: [100, "Full name cannot exceed 100 characters"],
    },

    access: {
      type: [{
        type: String,
        enum: USER_ROLES,
      }],
      default: ["student"],
      required: true,
      validate: {
        validator: (roles: string[]) => roles.length > 0,
        message: "A user must have at least one role",
      },
    },

    profilePic: {
      type: profilePictureSchema,
      required: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    strict: "throw",
  }
);

userSchema.pre("save", async function () {
  const password = this.password;
  if (!this.isModified("password") || !password) return;

  const hashedPassword = await bcrypt.hash(password, 12);
  this.set("password", hashedPassword);
});

userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  if (!this.password) return false;

  return bcrypt.compare(candidatePassword, this.password);
};

export type User = InferSchemaType<typeof userSchema>;

export const UserModel = model("User", userSchema);