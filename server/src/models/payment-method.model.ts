import {
  Schema,
  model,
  type InferSchemaType,
} from "mongoose";
import { UserModel } from "./user.model.js";

const paymentMethodSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: UserModel.modelName,
      required: true,
      index: true,
    },

    provider: {
      type: String,
      enum: ["razorpay"],
      required: true,
      default: "razorpay",
    },

    razorpayCustomerId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    razorpayTokenId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
      unique: true,
    },

    cardNetwork: {
      type: String,
      trim: true,
      maxlength: 50,
    },

    last4: {
      type: String,
      match: [/^\d{4}$/, "Card last four must contain exactly 4 digits"],
    },

    expiryMonth: {
      type: Number,
      min: [1, "Expiry month must be between 1 and 12"],
      max: [12, "Expiry month must be between 1 and 12"],
      validate: {
        validator: Number.isInteger,
        message: "Expiry month must be an integer",
      },
    },

    expiryYear: {
      type: Number,
      min: [2000, "Expiry year is invalid"],
      validate: {
        validator: Number.isInteger,
        message: "Expiry year must be an integer",
      },
    },

    isActive: {
      type: Boolean,
      default: true,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    strict: "throw",
  }
);

export type PaymentMethod = InferSchemaType<typeof paymentMethodSchema>;

export const PaymentMethodModel = model(
  "PaymentMethod",
  paymentMethodSchema
);
