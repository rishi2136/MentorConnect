import {
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { MentorSessionStatsContext } from "./mentorSessionStatsContext";

export const MentorSessionStatsProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [mentorSessionCounts, setCounts] = useState<Record<string, number>>({});
  const setMentorSessionCounts = useCallback((counts: Record<string, number>) => {
    setCounts((current) => ({ ...current, ...counts }));
  }, []);
  const value = useMemo(
    () => ({ mentorSessionCounts, setMentorSessionCounts }),
    [mentorSessionCounts, setMentorSessionCounts]
  );

  return (
    <MentorSessionStatsContext.Provider value={value}>
      {children}
    </MentorSessionStatsContext.Provider>
  );
};
