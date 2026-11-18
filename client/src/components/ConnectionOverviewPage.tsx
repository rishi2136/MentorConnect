import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { io } from "socket.io-client";
import { formatSessionSchedule } from "../utils/timezone";
import { isSessionCallWindowOpen } from "../utils/session-call";
import "../mentor-dashboard/MentorDashboard.css";

type SessionStatus =
  | "requested"
  | "accepted"
  | "rejected"
  | "cancelled"
  | "completed";

type OverviewSession = {
  _id: string;
  topic: string;
  scheduledAt: string;
  scheduledTimezone?: string;
  durationMinutes: number;
  status: SessionStatus;
  studentId: { userId: { fullName: string } };
  mentorId: {
    userId: { fullName: string };
    timezone?: string;
  };
};

type ConnectionOverviewPageProps = {
  userName: string;
  role: "student" | "mentor";
  onOpenSessions: () => void;
  onOpenProfile: () => void;
};

export const ConnectionOverviewPage = ({
  userName,
  role,
  onOpenSessions,
  onOpenProfile,
}: ConnectionOverviewPageProps) => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<OverviewSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [now, setNow] = useState(0);

  useEffect(() => {
    const socket = io({ withCredentials: true });
    socket.on("session:updated", () => {
      setRefreshKey((key) => key + 1);
    });
    socket.on("session:deleted", () => {
      setRefreshKey((key) => key + 1);
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let isActive = true;
    const loadSessions = async () => {
      setIsLoading(true);
      setError("");
      try {
        const response = await fetch("/api/audio-meet-sessions/me", {
          credentials: "include",
        });
        if (!response.ok) throw new Error("Could not load your sessions.");
        const result = (await response.json()) as {
          sessions: OverviewSession[];
        };
        if (isActive) {
          setSessions(result.sessions);
          setNow(Date.now());
        }
      } catch (loadError) {
        if (isActive) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load your sessions."
          );
        }
      } finally {
        if (isActive) setIsLoading(false);
      }
    };
    void loadSessions();
    return () => {
      isActive = false;
    };
  }, [refreshKey]);

  const featuredSessions = useMemo(
    () =>
      sessions
        .filter(
          (session) => {
            const startsAt = new Date(session.scheduledAt).getTime();
            const isOngoing =
              session.status === "accepted" &&
              startsAt <= now &&
              startsAt + session.durationMinutes * 60_000 > now;
            return (
              isOngoing ||
              (["requested", "accepted"].includes(session.status) &&
                startsAt >= now)
            );
          }
        )
        .sort(
          (first, second) => {
            const firstStart = new Date(first.scheduledAt).getTime();
            const secondStart = new Date(second.scheduledAt).getTime();
            const firstOngoing =
              first.status === "accepted" &&
              firstStart <= now &&
              firstStart + first.durationMinutes * 60_000 > now;
            const secondOngoing =
              second.status === "accepted" &&
              secondStart <= now &&
              secondStart + second.durationMinutes * 60_000 > now;
            if (firstOngoing !== secondOngoing) return firstOngoing ? -1 : 1;
            return firstStart - secondStart;
          }
        )
        .slice(0, 5),
    [sessions, now]
  );
  const pendingCount = sessions.filter(
    (session) => session.status === "requested"
  ).length;
  const acceptedCount = sessions.filter(
    (session) => session.status === "accepted"
  ).length;

  return (
    <section className="connection-overview">
      <div className="connection-overview-header">
        <div>
          <span className="eyebrow">
            {role === "mentor" ? "Mentor workspace" : "Student workspace"}
          </span>
          <h2>Welcome, {userName}.</h2>
          <p>
            {role === "mentor"
              ? "Manage session requests and make it easy for students to book time with you."
              : "Find a mentor, prepare for your session, and keep your conversations together."}
          </p>
        </div>
        <button
          className="button outline small"
          type="button"
          onClick={() => setRefreshKey((key) => key + 1)}
          disabled={isLoading}
        >
          {isLoading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="connection-overview-actions">
        {role === "student" && (
          <button
            className="button"
            type="button"
            onClick={() => navigate("/mentors")}
          >
            Find a mentor
          </button>
        )}
        {role === "mentor" && (
          <button className="button" type="button" onClick={onOpenProfile}>
            Set profile and availability
          </button>
        )}
        <button
          className="button outline"
          type="button"
          onClick={onOpenSessions}
        >
          View all sessions
        </button>
      </div>

      <div className="connection-overview-metrics">
        <article className="dashboard-panel">
          <span>Total sessions</span>
          <strong>{isLoading ? "—" : sessions.length}</strong>
        </article>
        <article className="dashboard-panel">
          <span>{role === "mentor" ? "Requests to review" : "Awaiting mentor"}</span>
          <strong>{isLoading ? "—" : pendingCount}</strong>
        </article>
        <article className="dashboard-panel">
          <span>Accepted sessions</span>
          <strong>{isLoading ? "—" : acceptedCount}</strong>
        </article>
      </div>

      <section className="dashboard-panel connection-upcoming">
        <div className="panel-heading">
          <div>
            <h2>Upcoming &amp; ongoing sessions</h2>
            <p>All session times use UTC.</p>
          </div>
          <button type="button" onClick={onOpenSessions}>
            View all
          </button>
        </div>
        {error ? (
          <p className="connection-overview-error" role="alert">{error}</p>
        ) : isLoading ? (
          <p className="connection-overview-empty">Loading your sessions...</p>
        ) : featuredSessions.length === 0 ? (
          <p className="connection-overview-empty">
            {role === "mentor"
              ? "No upcoming requests yet. Add your weekly availability so students can find a time."
              : "No sessions scheduled yet. Browse mentors to request your first session."}
          </p>
        ) : (
          <div className="connection-upcoming-list">
            {featuredSessions.map((session) => {
              const startsAt = new Date(session.scheduledAt).getTime();
              const isOngoing =
                session.status === "accepted" &&
                startsAt <= now &&
                startsAt + session.durationMinutes * 60_000 > now;
              const counterpart =
                role === "mentor"
                  ? session.studentId.userId.fullName
                  : session.mentorId.userId.fullName;
              const schedule = formatSessionSchedule(session.scheduledAt);
              return (
                <article className="connection-session-row" key={session._id}>
                  <div>
                    <strong>{session.topic}</strong>
                    <span>
                      {counterpart} ·{" "}
                      {schedule} · {session.durationMinutes} min
                    </span>
                  </div>
                  <span className={`session-badge ${isOngoing ? "live" : session.status}`}>
                    {isOngoing ? "Ongoing" : session.status}
                  </span>
                  {session.status === "accepted" && (
                    <button
                      className="button outline small"
                      type="button"
                      onClick={() =>
                        navigate(
                          `/call/${session._id}${
                            isSessionCallWindowOpen(
                              session.scheduledAt,
                              session.durationMinutes,
                              now
                            )
                              ? "?join=1"
                              : ""
                          }`
                        )
                      }
                    >
                      {isSessionCallWindowOpen(
                        session.scheduledAt,
                        session.durationMinutes,
                        now
                      )
                        ? "Start video call"
                        : "Open video session"}
                    </button>
                  )}
                  <button
                    className="button outline small"
                    type="button"
                    onClick={() =>
                      navigate(`/chat?sessionId=${session._id}`)
                    }
                  >
                    Open conversation
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </section>
  );
};
