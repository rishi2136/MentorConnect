
import assert from "node:assert/strict";
import test from "node:test";
import { ApiError } from "./api-error.service.js";
import { buildIceServers } from "./ice-server.service.js";

const environment = {
  METERED_APP_DOMAIN: "mentorconnect.metered.live",
  METERED_API_KEY: "test-credential-api-key",
};

const meteredResponse = [
  { urls: "stun:stun.relay.metered.ca:80" },
  {
    urls: "turn:global.relay.metered.ca:80",
    username: "test-user",
    credential: "test-password",
  },
  {
    urls: "turn:global.relay.metered.ca:443?transport=tcp",
    username: "test-user",
    credential: "test-password",
  },
];

test("fetches and returns the complete Metered ICE server configuration", async () => {
  let requestedUrl = "";

  const configuration = await buildIceServers(environment, async (input) => {
    requestedUrl = String(input);

    return new Response(JSON.stringify(meteredResponse), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });

  assert.equal(configuration.turnConfigured, true);
  assert.deepEqual(configuration.iceServers, meteredResponse);
  assert.match(requestedUrl, /mentorconnect\.metered\.live/);
  assert.match(requestedUrl, /apiKey=test-credential-api-key/);
});

test("rejects missing Metered environment variables", async () => {
  await assert.rejects(
    () => buildIceServers({}, async () => new Response("[]")),
    (error: unknown) =>
      error instanceof ApiError &&
      error.statusCode === 503
  );
});

test("rejects unsuccessful Metered API responses", async () => {
  await assert.rejects(
    () =>
      buildIceServers(environment, async () =>
        new Response("Unauthorized", { status: 401 })
      ),
    (error: unknown) =>
      error instanceof ApiError &&
      error.statusCode === 503
  );
});

test("rejects Metered responses without TURN servers", async () => {
  await assert.rejects(
    () =>
      buildIceServers(environment, async () =>
        new Response(
          JSON.stringify([{ urls: "stun:stun.example.test:80" }]),
          { status: 200 }
        )
      ),
    (error: unknown) =>
      error instanceof ApiError &&
      error.statusCode === 502
  );
});

test("rejects TURN entries without credentials", async () => {
  await assert.rejects(
    () =>
      buildIceServers(environment, async () =>
        new Response(
          JSON.stringify([{ urls: "turn:turn.example.test:80" }]),
          { status: 200 }
        )
      ),
    (error: unknown) =>
      error instanceof ApiError &&
      error.statusCode === 502
  );
});
