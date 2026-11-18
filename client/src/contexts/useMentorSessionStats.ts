import { useContext } from "react";
import { MentorSessionStatsContext } from "./mentorSessionStatsContext";

export const useMentorSessionStats = () => {
  const context = useContext(MentorSessionStatsContext);
  if (!context) {
    throw new Error(
      "useMentorSessionStats must be used within MentorSessionStatsProvider"
    );
  }
  return context;
};
