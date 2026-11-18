import { Schema, model, type InferSchemaType } from "mongoose";
import { AudioMeetSessionModel } from "./audio-meet-session.model.js";
import { UserModel } from "./user.model.js";

const chatMessageSchema = new Schema(
  {
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: AudioMeetSessionModel.modelName,
      required: true,
      index: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: UserModel.modelName,
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 2000,
    },
  },
  { timestamps: true, versionKey: false, strict: "throw" }
);

chatMessageSchema.index({ sessionId: 1, createdAt: 1 });

export type ChatMessage = InferSchemaType<typeof chatMessageSchema>;

export const ChatMessageModel = model("ChatMessage", chatMessageSchema);
