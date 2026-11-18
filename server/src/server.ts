import "dotenv/config";
import { createServer } from "node:http";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import { attachSocketServer } from "./socket.js";
import { backfillMissingMentorProfiles } from "./services/mentor-profile.service.js";

const port = Number(process.env.PORT ?? 5000);
const httpServer = createServer(app);
attachSocketServer(httpServer);

try {
  await connectDB();

  const repairedProfiles = await backfillMissingMentorProfiles();
  if (repairedProfiles > 0) {
    console.info(`Created ${repairedProfiles} missing mentor profile(s)`);
  }

  httpServer.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
} catch (error) {
  console.error("Failed to start server", error);
  process.exitCode = 1;
}
