import { createContext } from "react";

export type MentorSessionStatsContextValue = {
  mentorSessionCounts: Record<string, number>;
  setMentorSessionCounts: (counts: Record<string, number>) => void;
};

export const MentorSessionStatsContext =
  createContext<MentorSessionStatsContextValue | null>(null);
