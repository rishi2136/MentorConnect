import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { io } from "socket.io-client";
import { useMentorSessionStats } from "../../contexts/useMentorSessionStats";
import {
  dateTimeInputToInstant,
  formatDateTimeInputInZone,
  formatSessionSchedule,
  getBrowserTimeZone,
} from "../../utils/timezone";
import { isSessionCallWindowOpen } from "../../utils/session-call";
import "../MentorDashboard.css";

type ApiSession = {
  _id: string;
  topic: string;
  notes?: string;
  scheduledAt: string;
  scheduledTimezone?: string;
  durationMinutes: number;
  status: "requested" | "accepted" | "rejected" | "cancelled" | "completed";
  price?: number;
  isFreeSession?: boolean;
  studentId: {
    _id: string;
    collegeName?: string;
    course?: string;
    userId: {
      _id: string;
      fullName: string;
    };
  };
  mentorId: {
    _id: string;
    expertise?: string[];
    timezone?: string;
    userId: {
      _id: string;
      fullName: string;
    };
  };
};

type CurrentUser = {
  id: string;
  fullName: string;
  access: Array<"student" | "mentor" | "admin">;
};

type SessionForm = {
  topic: string;
  notes: string;
  scheduledAt: string;
  durationMinutes: number;
};

const tones = ["sky", "peach", "lavender", "lime", "coral", "mint"];

export const SessionsPanel = () => {
  const navigate = useNavigate();
  const { setMentorSessionCounts } = useMentorSessionStats();
  const [inputTimezone] = useState(getBrowserTimeZone);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [apiSessions, setApiSessions] = useState<ApiSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [filter, setFilter] = useState<string>("All sessions");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [now, setNow] = useState(0);
  const [selectedSession, setSelectedSession] = useState<ApiSession | null>(null);
  const [editingSession, setEditingSession] = useState<ApiSession | null>(null);
  const [editForm, setEditForm] = useState<SessionForm | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  /**
   * Initial data load on mount
   */
  useEffect(() => {
    let isActive = true;

    const fetchSessionsAndUser = async () => {
      try {
        const [userRes, sessionsRes] = await Promise.all([
          fetch("/api/users/me", { credentials: "include" }),
          fetch("/api/audio-meet-sessions/me", { credentials: "include" }),
        ]);

        if (!userRes.ok) throw new Error("Could not load your account.");
        if (!sessionsRes.ok) throw new Error("Could not load your sessions.");

        const { user } = (await userRes.json()) as { user: CurrentUser };
        const { sessions } = (await sessionsRes.json()) as {
          sessions: ApiSession[];
        };
        if (isActive) {
          setCurrentUser(user);
          setApiSessions(sessions);
          setNow(Date.now());
        }
      } catch (error) {
        if (isActive) {
          setLoadError(
            error instanceof Error ? error.message : "Could not load your sessions."
          );
        }
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    void fetchSessionsAndUser();

    return () => {
      isActive = false;
    };
  }, []);

  /**
   * Refetches sessions following a user-triggered state change
   */
  const refreshSessions = async () => {
    const response = await fetch("/api/audio-meet-sessions/me", {
      credentials: "include",
    });
    if (!response.ok) throw new Error("Your action succeeded, but sessions could not be refreshed.");
    const { sessions } = (await response.json()) as {
      sessions: ApiSession[];
    };
    setApiSessions(sessions);
  };

  useEffect(() => {
    const socket = io({ withCredentials: true });
    const refresh = () => {
      void refreshSessions().catch((error: unknown) => {
        setLoadError(
          error instanceof Error
            ? error.message
            : "Could not refresh your sessions."
        );
      });
    };
    const removeDeleted = (event: { sessionId: string }) => {
      setApiSessions((sessions) =>
        sessions.filter((session) => session._id !== event.sessionId)
      );
      setSelectedSession((session) =>
        session?._id === event.sessionId ? null : session
      );
      setEditingSession((session) =>
        session?._id === event.sessionId ? null : session
      );
      setEditForm(null);
    };
    socket.on("session:updated", refresh);
    socket.on("session:deleted", removeDeleted);
    return () => {
      socket.disconnect();
    };
  }, []);

  /**
   * Handle session status transitions via PATCH /api/audio-meet-sessions/:sessionId/status
   */
  const handleStatusChange = async (
    sessionId: string,
    newStatus: "accepted" | "rejected" | "cancelled" | "completed"
  ) => {
    setActionError("");
    try {
      const response = await fetch(`/api/audio-meet-sessions/${sessionId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errData = (await response.json()) as { message?: string };
        throw new Error(errData.message || "Failed to update session status");
      }

      const result = (await response.json()) as {
        mentorProfileId?: string;
        mentorSessionCount?: number;
      };
      if (
        result.mentorProfileId &&
        typeof result.mentorSessionCount === "number"
      ) {
        setMentorSessionCounts({
          [result.mentorProfileId]: result.mentorSessionCount,
        });
      }
      await refreshSessions();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Error updating status");
    }
  };

  const openEdit = (session: ApiSession) => {
    setActionError("");
    setEditingSession(session);
    setEditForm({
      topic: session.topic,
      notes: session.notes ?? "",
      scheduledAt: formatDateTimeInputInZone(
        new Date(session.scheduledAt),
        inputTimezone
      ),
      durationMinutes: session.durationMinutes,
    });
  };

  const handleEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingSession || !editForm || isSaving) return;
    setActionError("");
    setIsSaving(true);
    try {
      const scheduledAt = dateTimeInputToInstant(
        editForm.scheduledAt,
        inputTimezone
      );
      const response = await fetch(
        `/api/audio-meet-sessions/${editingSession._id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            ...editForm,
            scheduledAt: scheduledAt.toISOString(),
          }),
        }
      );
      if (!response.ok) {
        const result = (await response.json()) as { message?: string };
        throw new Error(result.message || "Could not update this session.");
      }
      await refreshSessions();
      setSelectedSession(null);
      setEditingSession(null);
      setEditForm(null);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Could not update this session."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (session: ApiSession) => {
    const confirmed = window.confirm(
      "Delete this completed or past session? Its conversation history will also be permanently deleted."
    );
    if (!confirmed) return;
    setActionError("");
    try {
      const response = await fetch(
        `/api/audio-meet-sessions/${session._id}`,
        { method: "DELETE", credentials: "include" }
      );
      if (!response.ok) {
        const result = (await response.json()) as { message?: string };
        throw new Error(result.message || "Could not delete this session.");
      }
      const result = (await response.json()) as {
        mentorProfileId?: string;
        mentorSessionCount?: number;
      };
      if (
        result.mentorProfileId &&
        typeof result.mentorSessionCount === "number"
      ) {
        setMentorSessionCounts({
          [result.mentorProfileId]: result.mentorSessionCount,
        });
      }
      setApiSessions((sessions) =>
        sessions.filter((item) => item._id !== session._id)
      );
      setSelectedSession(null);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Could not delete this session."
      );
    }
  };

  const isMentor = currentUser?.access.includes("mentor") ?? false;
  const isStudent = currentUser?.access.includes("student") ?? false;

  const filterOptions = [
    "All sessions",
    "requested",
    "accepted",
    "rejected",
    "cancelled",
    "completed",
  ];

  const filteredApiSessions = useMemo(() => {
    return apiSessions
      .filter((s) => {
        const matchesFilter = filter === "All sessions" || s.status === filter;
        const counterpartName = isMentor
          ? s.studentId?.userId?.fullName || "Student"
          : s.mentorId?.userId?.fullName || "Mentor";
        const matchesQuery =
          `${counterpartName} ${s.topic}`
            .toLowerCase()
            .includes(query.toLowerCase());
        return matchesFilter && matchesQuery;
      })
      .sort((a, b) => {
        if (sortBy === "date") {
          return new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime();
        }
        const nameA = isMentor ? a.studentId?.userId?.fullName : a.mentorId?.userId?.fullName;
        const nameB = isMentor ? b.studentId?.userId?.fullName : b.mentorId?.userId?.fullName;
        return (nameA || "").localeCompare(nameB || "");
      });
  }, [apiSessions, filter, isMentor, query, sortBy]);

  return (
    <section className="sessions-view">
      <div className="sessions-heading">
        <div>
          <span className="eyebrow">Your mentoring calendar</span>
          <h2>
            {isMentor ? "Student" : "Mentorship"} <em>sessions.</em>
          </h2>
          <p>Keep every conversation, commitment, and follow-up in one place.</p>
          <p>All session times use UTC.</p>
        </div>
        {!isMentor && (
          <button
            className="button small"
            type="button"
            onClick={() => navigate("/mentors")}
          >
            ＋ Browse mentors
          </button>
        )}
      </div>

      {actionError && (
        <div
          style={{
            background: "#fee2e2",
            color: "#991b1b",
            padding: "8px 14px",
            borderRadius: 6,
            marginBottom: 16,
            fontSize: 13,
          }}
        >
          {actionError}
        </div>
      )}

      <div className="sessions-toolbar">
        <label className="session-search">
          <span aria-hidden="true">⌕</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search participants or topics"
            aria-label="Search sessions"
          />
        </label>
        <div
          className="session-filters"
          role="group"
          aria-label="Filter sessions"
        >
          {filterOptions.map((item) => (
            <button
              className={filter === item ? "active" : ""}
              type="button"
              key={item}
              onClick={() => setFilter(item)}
            >
              <span style={{ textTransform: "capitalize" }}>{item}</span>
            </button>
          ))}
        </div>
        <select
          aria-label="Sort sessions"
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value)}
        >
          <option value="date">Sort: Date</option>
          <option value="name">Sort: Name</option>
        </select>
      </div>

      <div className="sessions-summary">
        <span>
          <strong>
            {filteredApiSessions.length}
          </strong>{" "}
          sessions {isLoading && "(loading...)"}
        </span>
      </div>

      {loadError && (
        <div className="profile-error" role="alert">
          {loadError}
        </div>
      )}
      {loadError ? null : apiSessions.length === 0 && !isLoading ? (
        <div className="chat-workspace-placeholder">
          <strong>No mentoring sessions yet</strong>
          <span>
            {isMentor
              ? "When a student requests a session, it will appear here."
              : "Browse mentor profiles and request a session to get started."}
          </span>
          {!isMentor && (
            <button
              className="button small"
              type="button"
              onClick={() => navigate("/mentors")}
            >
              Browse mentors
            </button>
          )}
        </div>
      ) : (
        <div className="sessions-list">
          {filteredApiSessions.length === 0 ? (
            <div className="empty-state" style={{ padding: "32px 0", textAlign: "center" }}>
              <p style={{ color: "var(--muted)" }}>
                {isLoading ? "Loading sessions..." : "No sessions match the current filter."}
              </p>
            </div>
          ) : (
            filteredApiSessions.map((session, index) => {
              const counterpart = isMentor
                ? session.studentId?.userId?.fullName || "Student"
                : session.mentorId?.userId?.fullName || "Mentor";
              const initials = counterpart
                .split(/\s+/)
                .slice(0, 2)
                .map((p) => p[0])
                .join("")
                .toUpperCase();
              const scheduledDate = new Date(session.scheduledAt);
              const startsAt = scheduledDate.getTime();
              const isOngoing =
                session.status === "accepted" &&
                startsAt <= now &&
                startsAt + session.durationMinutes * 60_000 > now;
              const timeStatus = isOngoing
                ? "Ongoing"
                : startsAt > now
                  ? "Upcoming"
                  : "Past";
              const schedule = formatSessionSchedule(session.scheduledAt);

              return (
                <article className="session-card" key={session._id}>
                  <span className={`session-avatar ${tones[index % tones.length]}`}>
                    {initials}
                  </span>
                  <div className="session-card-info">
                    <div className="session-card-title">
                      <h3>{session.topic}</h3>
                      <span className={`session-badge ${session.status}`}>
                        {session.status}
                      </span>
                      <span className={`session-badge ${isOngoing ? "live" : timeStatus.toLowerCase()}`}>
                        {timeStatus}
                      </span>
                    </div>
                    <p>
                      with <strong>{counterpart}</strong>
                    </p>
                    <div className="session-details">
                      <span>
                        ◷ {schedule}
                      </span>
                      <span>◌ {session.durationMinutes} min</span>
                      <span>Video call</span>
                      <span>▣ {session.isFreeSession ? "Free" : `$${session.price ?? 0}`}</span>
                    </div>
                    {session.notes && (
                      <p style={{ fontSize: 12, color: "var(--muted)", margin: "4px 0 0" }}>
                        Note: {session.notes}
                      </p>
                    )}
                    <button
                      className="button session-action"
                      type="button"
                      onClick={() => setSelectedSession(session)}
                    >
                      View details
                    </button>
                  </div>

                  <div className="session-card-actions">
                    {/* Mentor action controls */}
                    {isMentor && session.status === "requested" && (
                      <>
                        <button
                          className="button small"
                          type="button"
                          onClick={() => handleStatusChange(session._id, "accepted")}
                        >
                          Accept
                        </button>
                        <button
                          className="button small outline"
                          type="button"
                          onClick={() => handleStatusChange(session._id, "rejected")}
                        >
                          Reject
                        </button>
                      </>
                    )}

                    {isMentor && session.status === "accepted" && (
                      <button
                        className="button small"
                        type="button"
                        onClick={() => handleStatusChange(session._id, "completed")}
                      >
                        Complete
                      </button>
                    )}

                    {/* Student action controls */}
                    {!isMentor && (session.status === "requested" || session.status === "accepted") && (
                      <button
                        className="button small outline"
                        type="button"
                        onClick={() => handleStatusChange(session._id, "cancelled")}
                      >
                        Cancel
                      </button>
                    )}

                    {isStudent &&
                      session.status === "requested" &&
                      startsAt > now && (
                        <button
                          className="button small outline"
                          type="button"
                          onClick={() => openEdit(session)}
                        >
                          Edit
                        </button>
                      )}

                    {(session.status === "completed" ||
                      startsAt + session.durationMinutes * 60_000 <= now) && (
                      <button
                        className="button small outline"
                        type="button"
                        onClick={() => void handleDelete(session)}
                      >
                        Delete
                      </button>
                    )}

                    {/* Chat button for accepted / active sessions */}
                    {(session.status === "accepted" || session.status === "completed") && (
                      <button
                        className="button session-action live"
                        type="button"
                        onClick={() => navigate(`/chat?sessionId=${session._id}`)}
                      >
                        Chat <span aria-hidden="true">↗</span>
                      </button>
                    )}
                    {session.status === "accepted" && (
                      <button
                        className="button session-action live"
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
                          : "Open video session"}{" "}
                        <span aria-hidden="true">↗</span>
                      </button>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </div>
      )}

      {(selectedSession || editingSession) && (
        <div
          className="session-dialog-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSaving) {
              setSelectedSession(null);
              setEditingSession(null);
              setEditForm(null);
            }
          }}
        >
          <section
            className="session-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="session-dialog-title"
          >
            <button
              className="session-dialog-close"
              type="button"
              aria-label="Close dialog"
              onClick={() => {
                if (!isSaving) {
                  setSelectedSession(null);
                  setEditingSession(null);
                  setEditForm(null);
                }
              }}
            >
              ×
            </button>
            {editingSession && editForm ? (
              <>
                <span className="eyebrow">Update request</span>
                <h3 id="session-dialog-title">Edit your session</h3>
                <p className="session-dialog-help">
                  Enter the time using your computer&apos;s clock. The
                  mentor&apos;s current availability and other bookings are
                  checked if you change the schedule.
                </p>
                <form className="session-edit-form" onSubmit={handleEditSubmit}>
                  <label>
                    Topic
                    <input
                      required
                      minLength={2}
                      maxLength={160}
                      value={editForm.topic}
                      onChange={(event) =>
                        setEditForm({ ...editForm, topic: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    Scheduled time
                    <input
                      required
                      type="datetime-local"
                      value={editForm.scheduledAt}
                      onChange={(event) =>
                        setEditForm({
                          ...editForm,
                          scheduledAt: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    Duration
                    <select
                      value={editForm.durationMinutes}
                      onChange={(event) =>
                        setEditForm({
                          ...editForm,
                          durationMinutes: Number(event.target.value),
                        })
                      }
                    >
                      {[15, 30, 45, 60, 90, 120, 180].map((minutes) => (
                        <option key={minutes} value={minutes}>
                          {minutes} minutes
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Notes
                    <textarea
                      maxLength={2000}
                      rows={4}
                      value={editForm.notes}
                      onChange={(event) =>
                        setEditForm({ ...editForm, notes: event.target.value })
                      }
                    />
                  </label>
                  {actionError && (
                    <p className="session-dialog-error" role="alert">
                      {actionError}
                    </p>
                  )}
                  <div className="session-dialog-actions">
                    <button
                      className="button outline small"
                      type="button"
                      disabled={isSaving}
                      onClick={() => {
                        setEditingSession(null);
                        setEditForm(null);
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      className="button small"
                      type="submit"
                      disabled={isSaving}
                    >
                      {isSaving ? "Saving..." : "Save changes"}
                    </button>
                  </div>
                </form>
              </>
            ) : selectedSession ? (
              <>
                <span className="eyebrow">Session details</span>
                <h3 id="session-dialog-title">{selectedSession.topic}</h3>
                <p>
                  With{" "}
                  {isMentor
                    ? selectedSession.studentId?.userId?.fullName || "Student"
                    : selectedSession.mentorId?.userId?.fullName || "Mentor"}
                </p>
                <dl className="session-detail-list">
                  <div><dt>Status</dt><dd>{selectedSession.status}</dd></div>
                  <div><dt>Call</dt><dd>Video · {selectedSession.durationMinutes} minutes</dd></div>
                  <div>
                    <dt>Session time (UTC)</dt>
                    <dd>{formatSessionSchedule(selectedSession.scheduledAt)}</dd>
                  </div>
                  {selectedSession.notes && (
                    <div><dt>Notes</dt><dd>{selectedSession.notes}</dd></div>
                  )}
                </dl>
                <div className="session-dialog-actions">
                  {isStudent &&
                    selectedSession.status === "requested" &&
                    new Date(selectedSession.scheduledAt).getTime() > now && (
                      <button
                        className="button outline small"
                        type="button"
                        onClick={() => openEdit(selectedSession)}
                      >
                        Edit request
                      </button>
                    )}
                  {(selectedSession.status === "completed" ||
                    new Date(selectedSession.scheduledAt).getTime() +
                      selectedSession.durationMinutes * 60_000 <= now) && (
                    <button
                      className="button outline small"
                      type="button"
                      onClick={() => void handleDelete(selectedSession)}
                    >
                      Delete session
                    </button>
                  )}
                  <button
                    className="button small"
                    type="button"
                    onClick={() => setSelectedSession(null)}
                  >
                    Done
                  </button>
                </div>
              </>
            ) : null}
          </section>
        </div>
      )}
    </section>
  );
};
