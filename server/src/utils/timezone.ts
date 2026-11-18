export const DEFAULT_TIME_ZONE = "Asia/Kolkata";

export function parseIsoInstant(value: string) {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/i.exec(
      value
    );
  if (!match) {
    throw new Error("Timestamp must include an ISO 8601 timezone or UTC offset.");
  }
  const [, year, month, day, hour, minute, second] = match.map(Number);
  const daysInMonth = new Date(Date.UTC(year!, month!, 0)).getUTCDate();
  if (
    month! < 1 ||
    month! > 12 ||
    day! < 1 ||
    day! > daysInMonth ||
    hour! > 23 ||
    minute! > 59 ||
    second! > 59
  ) {
    throw new Error("Timestamp is not a valid ISO 8601 date and time.");
  }
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new Error("Timestamp is not a valid ISO 8601 date and time.");
  }
  return date;
}

type AvailabilitySlot = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

function getLocalSlot(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const dayOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
    values.weekday ?? ""
  );
  if (dayOfWeek < 0) throw new Error("Could not determine the session weekday.");
  return {
    dayOfWeek,
    time: `${values.hour}:${values.minute}`,
  };
}

export function isWithinMentorAvailability(
  scheduledAt: Date,
  durationMinutes: number,
  timezone: string,
  availability: AvailabilitySlot[]
) {
  const endsAt = new Date(scheduledAt.getTime() + durationMinutes * 60_000);
  const startsAtSlot = getLocalSlot(scheduledAt, timezone);
  const endsAtSlot = getLocalSlot(endsAt, timezone);
  return availability.some(
    (slot) =>
      slot.dayOfWeek === startsAtSlot.dayOfWeek &&
      endsAtSlot.dayOfWeek === startsAtSlot.dayOfWeek &&
      slot.startTime <= startsAtSlot.time &&
      endsAtSlot.time >= startsAtSlot.time &&
      slot.endTime >= endsAtSlot.time
  );
}
