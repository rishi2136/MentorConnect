export const DEFAULT_TIME_ZONE = "Asia/Kolkata";
export const UTC_TIME_ZONE = "UTC";

type AvailabilitySlot = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

type DateTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

class InvalidTimeZoneError extends Error {}

export class NonexistentLocalTimeError extends Error {
  constructor(timeZone: string) {
    super(
      `That local time does not exist in ${timeZone} because of a daylight-saving transition. Choose another time.`
    );
    this.name = "NonexistentLocalTimeError";
  }
}

function assertValidTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format();
  } catch (error) {
    if (error instanceof RangeError) {
      throw new InvalidTimeZoneError(`"${timeZone}" is not a valid IANA timezone.`);
    }
    throw error;
  }
}

export function getBrowserTimeZone() {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (timeZone) {
    assertValidTimeZone(timeZone);
    return timeZone;
  }
  return UTC_TIME_ZONE;
}

export function isValidTimeZone(timeZone: string) {
  try {
    assertValidTimeZone(timeZone);
    return true;
  } catch (error) {
    if (error instanceof InvalidTimeZoneError) return false;
    throw error;
  }
}

export function formatDateTimeInZone(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

export function formatDateTimeForInputZone(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatSessionSchedule(
  scheduledAt: string | Date
) {
  const date =
    scheduledAt instanceof Date ? scheduledAt : new Date(scheduledAt);
  if (!Number.isFinite(date.getTime())) {
    throw new Error("Session has an invalid scheduled timestamp.");
  }
  return formatDateTimeInZone(date, UTC_TIME_ZONE);
}

function getDateTimeParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  return Object.fromEntries(parts.map(({ type, value }) => [type, value]));
}

function parseDateTimeInput(value: string): DateTimeParts {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) throw new Error("Choose a valid date and time.");
  const [, year, month, day, hour, minute] = match;
  return {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
  };
}

function partsMatch(actual: Record<string, string>, target: DateTimeParts) {
  return (
    Number(actual.year) === target.year &&
    Number(actual.month) === target.month &&
    Number(actual.day) === target.day &&
    Number(actual.hour) === target.hour &&
    Number(actual.minute) === target.minute
  );
}

export function formatDateTimeInputInZone(date: Date, timeZone: string) {
  const parts = getDateTimeParts(date, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function dateTimeInputToInstant(value: string, timeZone: string) {
  assertValidTimeZone(timeZone);
  const target = parseDateTimeInput(value);
  const targetAsUtc = Date.UTC(
    target.year,
    target.month - 1,
    target.day,
    target.hour,
    target.minute
  );
  const candidates = new Set<number>();

  for (let hoursOffset = -48; hoursOffset <= 48; hoursOffset += 6) {
    const probe = new Date(targetAsUtc + hoursOffset * 60 * 60 * 1000);
    const probeParts = getDateTimeParts(probe, timeZone);
    const representedAsUtc = Date.UTC(
      Number(probeParts.year),
      Number(probeParts.month) - 1,
      Number(probeParts.day),
      Number(probeParts.hour),
      Number(probeParts.minute)
    );
    const offset = representedAsUtc - probe.getTime();
    const candidate = targetAsUtc - offset;
    if (partsMatch(getDateTimeParts(new Date(candidate), timeZone), target)) {
      candidates.add(candidate);
    }
  }

  if (candidates.size === 0) {
    throw new NonexistentLocalTimeError(timeZone);
  }
  return new Date(Math.min(...candidates));
}

export function isWithinAvailability(
  value: string,
  durationMinutes: number,
  inputTimezone: string,
  availabilityTimezone: string,
  availability: AvailabilitySlot[]
) {
  const startsAt = dateTimeInputToInstant(value, inputTimezone);
  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);
  const localStart = getDateTimeParts(startsAt, availabilityTimezone);
  const localEnd = getDateTimeParts(endsAt, availabilityTimezone);
  const start = Number(localStart.hour) * 60 + Number(localStart.minute);
  const end = Number(localEnd.hour) * 60 + Number(localEnd.minute);
  const dayOfWeek = new Date(
    Date.UTC(
      Number(localStart.year),
      Number(localStart.month) - 1,
      Number(localStart.day)
    )
  ).getUTCDay();
  const sameLocalDay =
    localStart.year === localEnd.year &&
    localStart.month === localEnd.month &&
    localStart.day === localEnd.day;

  return availability.some((slot) => {
    const slotStart =
      Number(slot.startTime.slice(0, 2)) * 60 +
      Number(slot.startTime.slice(3, 5));
    const slotEnd =
      Number(slot.endTime.slice(0, 2)) * 60 +
      Number(slot.endTime.slice(3, 5));
    return (
      sameLocalDay &&
      slot.dayOfWeek === dayOfWeek &&
      start >= slotStart &&
      end >= start &&
      end <= slotEnd
    );
  });
}

export type UpcomingAvailabilityOption = {
  value: string;
  startsAt: Date;
};

export function getUpcomingAvailabilityOptions(
  availability: AvailabilitySlot[],
  availabilityTimezone: string,
  inputTimezone: string,
  durationMinutes: number,
  now: Date = new Date()
): UpcomingAvailabilityOption[] {
  if (availability.length === 0) return [];
  const today = getDateTimeParts(now, availabilityTimezone);
  const baseDay = Date.UTC(
    Number(today.year),
    Number(today.month) - 1,
    Number(today.day)
  );
  const candidates: Array<UpcomingAvailabilityOption> = [];
  const seenStartTimes = new Set<number>();

  for (let dayOffset = 0; dayOffset < 14; dayOffset += 1) {
    const day = new Date(baseDay + dayOffset * 24 * 60 * 60 * 1000);
    const dayOfWeek = day.getUTCDay();
    const date = `${day.getUTCFullYear()}-${String(day.getUTCMonth() + 1).padStart(2, "0")}-${String(day.getUTCDate()).padStart(2, "0")}`;
    for (const slot of availability) {
      if (slot.dayOfWeek !== dayOfWeek) continue;
      const slotStart =
        Number(slot.startTime.slice(0, 2)) * 60 +
        Number(slot.startTime.slice(3, 5));
      const slotEnd =
        Number(slot.endTime.slice(0, 2)) * 60 +
        Number(slot.endTime.slice(3, 5));

      for (
        let start = slotStart;
        start + durationMinutes <= slotEnd;
        start += durationMinutes
      ) {
        const time = `${String(Math.floor(start / 60)).padStart(2, "0")}:${String(start % 60).padStart(2, "0")}`;
        let startsAt: Date;
        try {
          startsAt = dateTimeInputToInstant(
            `${date}T${time}`,
            availabilityTimezone
          );
        } catch (error) {
          if (error instanceof NonexistentLocalTimeError) continue;
          throw error;
        }

        const timestamp = startsAt.getTime();
        if (timestamp <= now.getTime() || seenStartTimes.has(timestamp)) continue;
        const value = formatDateTimeInputInZone(startsAt, inputTimezone);
        if (
          dateTimeInputToInstant(value, inputTimezone).getTime() !== timestamp ||
          !isWithinAvailability(
            value,
            durationMinutes,
            inputTimezone,
            availabilityTimezone,
            availability
          )
        ) {
          continue;
        }

        seenStartTimes.add(timestamp);
        candidates.push({ value, startsAt });
      }
    }
  }

  return candidates
    .sort((first, second) => first.startsAt.getTime() - second.startsAt.getTime())
    .slice(0, 8);
}
