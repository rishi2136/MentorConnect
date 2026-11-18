import type { USER_ROLES } from "../models/user.model.js";

declare global {
  namespace Express {
    interface User {
      id: string;
      username: string;
      email: string;
      fullName: string;
      access: (typeof USER_ROLES)[number][];
    }
  }
}

export {};
