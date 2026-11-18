import assert from "node:assert/strict";
import test from "node:test";
import {
  dateTimeInputToInstant,
  formatDateTimeForInputZone,
  formatDateTimeInputInZone,
  formatDateTimeInZone,
  formatSessionSchedule,
  getUpcomingAvailabilityOptions,
  isWithinAvailability,
} from "../../client/src/utils/timezone.ts";
import {
  isWithinMentorAvailability,
  parseIsoInstant,
} from "../src/utils/timezone.js";

test("API timestamps require an explicit timezone and normalize to UTC instants", () => {
  assert.equal(
    parseIsoInstant("2027-01-15T09:00:00-08:00").toISOString(),
    "2027-01-15T17:00:00.000Z"
  );
  assert.throws(() => parseIsoInstant("2027-01-15T09:00:00"), /must include/);
  assert.throws(() => parseIsoInstant("2027-02-30T09:00:00Z"), /not a valid/);
});

test("converts local times to the same UTC instant across IANA timezones", () => {
  assert.equal(
    dateTimeInputToInstant("2027-01-15T09:00", "Asia/Kolkata").toISOString(),
    "2027-01-15T03:30:00.000Z"
  );
  assert.equal(
    dateTimeInputToInstant("2027-01-15T09:00", "America/Los_Angeles").toISOString(),
    "2027-01-15T17:00:00.000Z"
  );
  assert.equal(
    dateTimeInputToInstant("2027-07-15T09:00", "America/Los_Angeles").toISOString(),
    "2027-07-15T16:00:00.000Z"
  );
});

test("round-trips an instant and rejects nonexistent daylight-saving local times", () => {
  const instant = new Date("2027-07-15T16:00:00.000Z");
  assert.equal(
    formatDateTimeInputInZone(instant, "America/Los_Angeles"),
    "2027-07-15T09:00"
  );
  assert.throws(
    () => dateTimeInputToInstant("2027-03-14T02:30", "America/Los_Angeles"),
    /does not exist/
  );
});

test("resolves repeated fall-back times consistently to the earlier instant", () => {
  assert.equal(
    dateTimeInputToInstant("2027-11-07T01:30", "America/New_York").toISOString(),
    "2027-11-07T05:30:00.000Z"
  );
});

test("checks weekly availability in the mentor timezone across a different student timezone", () => {
  const availability = [
    { dayOfWeek: 4, startTime: "21:30", endTime: "22:30" },
  ];
  assert.equal(
    isWithinAvailability(
      "2027-07-15T09:00",
      30,
      "America/Los_Angeles",
      "Asia/Kolkata",
      availability
    ),
    true
  );
  assert.equal(
    isWithinAvailability(
      "2027-07-15T09:00",
      61,
      "America/Los_Angeles",
      "Asia/Kolkata",
      availability
    ),
    false
  );
});

test("session displays use the same UTC clock for every viewer", () => {
  const scheduledAt = new Date("2026-11-14T03:30:00.000Z");
  assert.equal(
    formatSessionSchedule(scheduledAt),
    formatDateTimeInZone(scheduledAt, "UTC")
  );
  assert.match(formatSessionSchedule(scheduledAt), /UTC/);
});

test("suggested booking slots use the student's input timezone while validating mentor availability", () => {
  const availability = Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    startTime: "09:00",
    endTime: "10:00",
  }));
  const options = getUpcomingAvailabilityOptions(
    availability,
    "Asia/Kolkata",
    "Asia/Kolkata",
    30,
    new Date("2026-11-14T00:00:00.000Z")
  );
  const firstOption = options[0];
  assert.ok(firstOption);
  assert.equal(firstOption.startsAt.toISOString(), "2026-11-14T03:30:00.000Z");
  assert.equal(firstOption.value, "2026-11-14T09:00");
  assert.equal(
    formatDateTimeInputInZone(firstOption.startsAt, "Asia/Kolkata"),
    "2026-11-14T09:00"
  );
  assert.equal(
    formatDateTimeForInputZone(firstOption.startsAt, "Asia/Kolkata"),
    "14 Nov 2026, 9:00 am"
  );
  assert.equal(
    dateTimeInputToInstant(firstOption.value, "Asia/Kolkata").getTime(),
    firstOption.startsAt.getTime()
  );
  assert.ok(options.length <= 8);
});

test("server availability validation uses mentor-local weekday and rejects fall-back clock rollback", () => {
  const availability = [
    { dayOfWeek: 4, startTime: "21:30", endTime: "22:30" },
  ];
  assert.equal(
    isWithinMentorAvailability(
      new Date("2027-07-15T16:00:00.000Z"),
      30,
      "Asia/Kolkata",
      availability
    ),
    true
  );
  assert.equal(
    isWithinMentorAvailability(
      new Date("2027-11-07T05:45:00.000Z"),
      30,
      "America/New_York",
      [{ dayOfWeek: 0, startTime: "01:30", endTime: "02:30" }]
    ),
    false
  );
});
