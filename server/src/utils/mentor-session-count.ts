export type CountedSessionStatus =
  | "requested"
  | "accepted"
  | "rejected"
  | "cancelled"
  | "completed";

export function getMentorSessionCountDelta(
  previousStatus: CountedSessionStatus,
  nextStatus: CountedSessionStatus
) {
  const wasCounted =
    previousStatus === "accepted" || previousStatus === "completed";
  const isCounted = nextStatus === "accepted" || nextStatus === "completed";
  return Number(isCounted) - Number(wasCounted);
}

export function isMentorSessionCounted(status: CountedSessionStatus) {
  return status === "accepted" || status === "completed";
}
