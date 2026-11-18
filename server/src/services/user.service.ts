import bcrypt from "bcryptjs";
import { UserModel, USER_ROLES } from "../models/user.model.js";

export type PublicRole = Exclude<(typeof USER_ROLES)[number], "admin">;

export class AuthenticationError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = "AuthenticationError";
  }
}

export async function createUser(input: {
  email: string;
  password: string;
  fullName: string;
  access: PublicRole;
}) {
  const email = input.email.trim().toLowerCase();
  const existingUser = await UserModel.exists({ email });

  if (existingUser) {
    throw new AuthenticationError("An account with this email already exists", 409);
  }

  const username = await createUsername(email);

  return UserModel.create({
    ...input,
    email,
    username,
    access: [input.access],
  });
}

export async function authenticateUser(email: string, password: string) {
  const user = await UserModel.findOne({
    email: email.trim().toLowerCase(),
  }).select("+password");

  if (!user?.password || !(await bcrypt.compare(password, user.password))) {
    throw new AuthenticationError("Invalid email or password", 401);
  }

  return user;
}

export async function findOrCreateGoogleUser(input: {
  googleId: string;
  email: string;
  fullName: string;
}) {
  const email = input.email.trim().toLowerCase();
  const userByGoogleId = await UserModel.findOne({
    googleId: input.googleId,
  });

  if (userByGoogleId) return userByGoogleId;

  const userByEmail = await UserModel.findOne({ email }).select("+googleId");

  if (userByEmail) {
    if (userByEmail.googleId && userByEmail.googleId !== input.googleId) {
      throw new AuthenticationError(
        "This email is linked to a different Google account",
        409
      );
    }

    userByEmail.googleId = input.googleId;
    await userByEmail.save();
    return userByEmail;
  }

  const username = await createUsername(email);

  return UserModel.create({
    username,
    email,
    fullName: input.fullName,
    googleId: input.googleId,
    access: ["student"],
  });
}

async function createUsername(email: string): Promise<string> {
  const localPart = email
    .split("@")[0]
    ?.toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 24);
  const base = (localPart && localPart.length >= 3 ? localPart : "user").padEnd(
    3,
    "0"
  );
  let username = base;
  let suffix = 1;

  while (await UserModel.exists({ username })) {
    const suffixText = String(suffix);
    username = `${base.slice(0, 30 - suffixText.length)}${suffixText}`;
    suffix += 1;
  }

  return username;
}