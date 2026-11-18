import mongoose from "mongoose";

export const mongoUri =
  process.env.MONGODB_URI ?? "mongodb://localhost:27017/mentorconnect";

mongoose.connection.on("error", (error: Error) => {
  console.error("MongoDB connection error:", error.message);
});

mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB disconnected");
});

mongoose.connection.on("reconnected", () => {
  console.info("MongoDB reconnected");
});

export async function connectDB(): Promise<void> {
  try {
    await mongoose.connect(mongoUri);
    console.info("MongoDB connected");
  } catch (error) {
    throw new Error(
      "Failed to connect to MongoDB. Check the database URI and ensure the server is reachable.",
      { cause: error }
    );
  }
}