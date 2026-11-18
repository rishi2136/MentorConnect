import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { ApiError } from "./api-error.service.js";
import { buildIceServers } from "./ice-server.service.js";

test("provides a default STUN server when TURN is not configured", () => {
  const configuration = buildIceServers("student-id", {});

  assert.equal(configuration.turnConfigured, false);
  assert.deepEqual(configuration.iceServers, [
    { urls: ["stun:stun.l.google.com:19302"] },
  ]);
});

test("creates expiring Coturn REST credentials without exposing the shared secret", () => {
  const now = Date.UTC(2026, 10, 9, 12);
  const secret = "local-test-secret";
  const userId = "507f1f77bcf86cd799439011";
  const configuration = buildIceServers(
    userId,
    {
      TURN_SERVER_URLS: "turn:turn.example.test:3478?transport=udp",
      TURN_SHARED_SECRET: secret,
      TURN_CREDENTIAL_TTL_SECONDS: "600",
    },
    now
  );
  const turnServer = configuration.iceServers.find(({ urls }) =>
    String(urls).startsWith("turn:")
  );
  assert.ok(turnServer);
  assert.equal(configuration.turnConfigured, true);
  assert.equal(
    turnServer.credential,
    createHmac("sha1", secret).update(turnServer.username!).digest("base64")
  );
  assert.equal(
    turnServer.username,
    `${Math.floor(now / 1000) + 600}:${userId}`
  );
  assert.ok("expiresAt" in configuration);
  assert.equal(
    configuration.expiresAt,
    new Date((Math.floor(now / 1000) + 600) * 1000).toISOString()
  );
  assert.equal(turnServer.credential?.includes(secret), false);
});

test("rejects TURN URLs without the server-side shared secret", () => {
  assert.throws(
    () =>
      buildIceServers("student-id", {
        TURN_SERVER_URLS: "turn:turn.example.test:3478",
      }),
    (error: unknown) =>
      error instanceof ApiError &&
      error.statusCode === 503 &&
      error.message.includes("TURN_SHARED_SECRET")
  );
});

test("rejects invalid TURN credential lifetimes", () => {
  assert.throws(
    () =>
      buildIceServers("student-id", {
        TURN_SERVER_URLS: "turn:turn.example.test:3478",
        TURN_SHARED_SECRET: "local-test-secret",
        TURN_CREDENTIAL_TTL_SECONDS: "30",
      }),
    (error: unknown) =>
      error instanceof ApiError && error.statusCode === 500
  );
});
