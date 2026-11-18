import assert from "node:assert/strict";
import test from "node:test";
import {
  getMentorSessionCountDelta,
  isMentorSessionCounted,
} from "../src/utils/mentor-session-count.js";

test("increments the mentor count when a request is accepted", () => {
  assert.equal(getMentorSessionCountDelta("requested", "accepted"), 1);
});

test("keeps the count when an accepted session is completed", () => {
  assert.equal(getMentorSessionCountDelta("accepted", "completed"), 0);
});

test("removes an accepted session from the count when it is cancelled", () => {
  assert.equal(getMentorSessionCountDelta("accepted", "cancelled"), -1);
  assert.equal(isMentorSessionCounted("completed"), true);
  assert.equal(isMentorSessionCounted("requested"), false);
});

test("does not change the count for a rejected request", () => {
  assert.equal(getMentorSessionCountDelta("requested", "rejected"), 0);
});
