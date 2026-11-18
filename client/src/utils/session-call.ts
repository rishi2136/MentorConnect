const CALL_EARLY_JOIN_WINDOW_MS = 5 * 60_000;

export function isSessionCallWindowOpen(
  scheduledAt: string | Date,
  durationMinutes: number,
  now = Date.now()
) {
  const startsAt = new Date(scheduledAt).getTime();
  if (!Number.isFinite(startsAt) || !Number.isFinite(durationMinutes)) {
    return false;
  }
  const opensAt = startsAt - CALL_EARLY_JOIN_WINDOW_MS;
  const endsAt = startsAt + durationMinutes * 60_000;
  return now >= opensAt && now <= endsAt;
}
