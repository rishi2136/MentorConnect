
import { isValidObjectId } from "mongoose";
import { AudioMeetSessionModel } from "../models/audio-meet-session.model.js";
import { MentorProfileModel } from "../models/mentor.model.js";
import { StudentProfileModel } from "../models/student.model.js";
import { ApiError } from "./api-error.service.js";

type IceServer = RTCIceServer;

function parseMeteredIceServers(payload: unknown): IceServer[] {
  if (!Array.isArray(payload) || payload.length === 0) {
    throw new ApiError("Metered returned an invalid ICE server configuration", 502);
  }

  const iceServers: IceServer[] = payload.map((item) => {
    if (!item || typeof item !== "object") {
      throw new ApiError("Metered returned an invalid ICE server entry", 502);
    }

    const entry = item as Record<string, unknown>;
    const rawUrls = entry.urls;

    const urls = Array.isArray(rawUrls) ? rawUrls : [rawUrls];

    if (
      urls.length === 0 ||
      !urls.every(
        (url) =>
          typeof url === "string" &&
          /^(stun|stuns|turn|turns):/i.test(url)
      )
    ) {
      throw new ApiError("Metered returned invalid ICE server URLs", 502);
    }

    const hasTurnUrl = urls.some(
      (url) => typeof url === "string" && /^(turn|turns):/i.test(url)
    );

    if (
      hasTurnUrl &&
      (typeof entry.username !== "string" ||
        typeof entry.credential !== "string")
    ) {
      throw new ApiError("Metered returned incomplete TURN credentials", 502);
    }

    return {
      urls: rawUrls as string | string[],
      ...(typeof entry.username === "string"
        ? { username: entry.username }
        : {}),
      ...(typeof entry.credential === "string"
        ? { credential: entry.credential }
        : {}),
    };
  });

  if (
    !iceServers.some((server) => {
      const urls = Array.isArray(server.urls)
        ? server.urls
        : [server.urls];

      return urls.some((url) => /^(turn|turns):/i.test(url));
    })
  ) {
    throw new ApiError("Metered did not provide a TURN server", 502);
  }

  return iceServers;
}

export async function buildIceServers(
  environment: NodeJS.ProcessEnv = process.env,
  fetchImpl: typeof fetch = fetch
) {
  const appDomain = environment.METERED_APP_DOMAIN?.trim();
  const apiKey = environment.METERED_API_KEY?.trim();

  if (!appDomain || !apiKey) {
    throw new ApiError(
      "Metered TURN configuration is missing on the server",
      503
    );
  }

  let endpoint: URL;

  try {
    const domain = appDomain
      .replace(/^https?:\/\//i, "")
      .replace(/\/+$/, "");

    if (domain.includes("/")) {
      throw new Error("Invalid app domain");
    }

    endpoint = new URL(
      `https://${domain}/api/v1/turn/credentials`
    );
  } catch {
    throw new ApiError("METERED_APP_DOMAIN is invalid", 500);
  }

  endpoint.searchParams.set("apiKey", apiKey);

  let response: Response;

  try {
    response = await fetchImpl(endpoint, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new ApiError("Could not connect to the Metered TURN service", 503);
  }

  if (!response.ok) {
    throw new ApiError(
      "Metered TURN service rejected the credential request",
      503
    );
  }

  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    throw new ApiError("Metered returned an invalid response", 502);
  }

  const iceServers = parseMeteredIceServers(payload);

  return {
    iceServers,
    turnConfigured: true,
  };
}

export async function getCallIceServerConfiguration(
  sessionId: string,
  userId: string,
  roles: Array<"admin" | "student" | "mentor">
) {
  if (!isValidObjectId(sessionId)) {
    throw new ApiError("Session ID is invalid", 400);
  }

  if (
    roles.includes("admin") ||
    (!roles.includes("student") && !roles.includes("mentor"))
  ) {
    throw new ApiError(
      "Only session participants can configure a call",
      403
    );
  }

  const session = await AudioMeetSessionModel.findById(sessionId)
    .select("studentId mentorId status scheduledAt durationMinutes")
    .lean();

  if (!session) {
    throw new ApiError("Session was not found", 404);
  }

  if (session.status !== "accepted") {
    throw new ApiError(
      "The session must be accepted before joining a call",
      409
    );
  }

  const startsAt = new Date(session.scheduledAt).getTime();
  const endsAt = startsAt + session.durationMinutes * 60_000;
  const now = Date.now();

  if (now < startsAt - 5 * 60_000 || now > endsAt) {
    throw new ApiError(
      "The call is outside its scheduled time window",
      409
    );
  }

  const [student, mentor] = await Promise.all([
    roles.includes("student")
      ? StudentProfileModel.exists({
          _id: session.studentId,
          userId,
        })
      : null,
    roles.includes("mentor")
      ? MentorProfileModel.exists({
          _id: session.mentorId,
          userId,
        })
      : null,
  ]);

  if (!student && !mentor) {
    throw new ApiError(
      "You are not a participant in this call",
      403
    );
  }

  return buildIceServers();
}
