import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import type { AuthMode } from "../App";
import type { AuthenticatedUser } from "../components/AuthModal";
import { SiteFooter } from "../components/SiteFooter";
import type { Mentor } from "../data/mentors";
import { useMentorSessionStats } from "../contexts/useMentorSessionStats";
import {
  dateTimeInputToInstant,
  formatDateTimeForInputZone,
  formatDateTimeInputInZone,
  getBrowserTimeZone,
  getUpcomingAvailabilityOptions,
  DEFAULT_TIME_ZONE,
  isWithinAvailability,
} from "../utils/timezone";
import "./MentorProfilePage.css";
import "../components/AuthModal.css";

type MentorProfilePageProps = {
  mentor: Mentor | null;
  onBack: () => void;
  onHomeClick: () => void;
  onAuthOpen: (mode: AuthMode) => void;
  currentUser?: AuthenticatedUser | null;
};

function getBookingTimePreview(
  scheduledAt: string,
  inputTimezone: string
) {
  if (!scheduledAt) return null;
  try {
    return formatDateTimeForInputZone(
      dateTimeInputToInstant(scheduledAt, inputTimezone),
      inputTimezone
    );
  } catch {
    return null;
  }
}

export const MentorProfilePage = ({
  mentor,
  onBack,
  onHomeClick,
  onAuthOpen,
  currentUser,
}: MentorProfilePageProps) => {
  const navigate = useNavigate();
  const { mentorSessionCounts } = useMentorSessionStats();

  // Booking modal state (hooks must be declared before any early return)
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [topic, setTopic] = useState("1:1 Career Guidance & Code Review");
  const [notes, setNotes] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingSessionId, setBookingSessionId] = useState("");
  const [inputTimezone] = useState(getBrowserTimeZone);
  const availabilityTimezone = mentor?.timezone || DEFAULT_TIME_ZONE;
  const availabilityOptions = useMemo(
    () =>
      getUpcomingAvailabilityOptions(
        mentor?.availability ?? [],
        availabilityTimezone,
        inputTimezone,
        durationMinutes
      ),
    [availabilityTimezone, durationMinutes, inputTimezone, mentor?.availability]
  );
  const sessionCount = mentor
    ? mentorSessionCounts[mentor.profileId ?? String(mentor.id)] ?? mentor.sessions
    : 0;

  // Guard: if no mentor is selected, show a fallback prompt
  if (!mentor) {
    return (
      <section style={{ padding: "4rem 2rem", textAlign: "center" }}>
        <h2>No mentor selected</h2>
        <p>Please choose a mentor from the directory first.</p>
        <button className="button" type="button" onClick={onBack}>
          ← Browse mentors
        </button>
      </section>
    );
  }

  const handleBookClick = () => {
    if (!currentUser) {
      onAuthOpen("login");
      return;
    }
    if (!currentUser.access.includes("student")) {
      alert("Only registered students can book mentoring sessions.");
      return;
    }
    setBookingError("");
    setBookingSuccess(false);
    setScheduledAt(availabilityOptions[0]?.value ?? "");
    setIsBookingOpen(true);
  };

  /**
   * Submit a video session request to the sessions API.
   */
  const handleBookingSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBookingLoading(true);
    setBookingError("");

    try {
      // If the mentor has a database profileId, use it; otherwise warn if this is a demo mentor
      const targetMentorId = mentor.profileId || (typeof mentor.id === "string" ? mentor.id : undefined);

      if (!targetMentorId) {
        throw new Error(
          "This mentor is currently a showcase profile. To book real sessions, please select a mentor registered in the directory or create a mentor profile in the database."
        );
      }
      if (
        !isWithinAvailability(
          scheduledAt,
          Number(durationMinutes),
          inputTimezone,
          availabilityTimezone,
          mentor.availability ?? []
        )
      ) {
        throw new Error(
          `Choose a time that fits ${mentor.name}'s available hours.`
        );
      }

      const response = await fetch("/api/audio-meet-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          mentorProfileId: targetMentorId,
          topic: topic.trim(),
          notes: notes.trim(),
          scheduledAt: dateTimeInputToInstant(
            scheduledAt,
            inputTimezone
          ).toISOString(),
          durationMinutes: Number(durationMinutes),
          mode: "video",
        }),
      });

      const data = (await response.json()) as {
        message?: string;
        session?: { _id?: string };
      };

      if (!response.ok) {
        throw new Error(data.message || "Failed to book session");
      }

      setBookingSuccess(true);
      setBookingSessionId(data.session?._id ?? "");
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : "Error booking session");
    } finally {
      setBookingLoading(false);
    }
  };

  const mentorTopics = [...(mentor.expertise ?? []), ...(mentor.skills ?? [])];
  const bookingTimePreview = getBookingTimePreview(
    scheduledAt,
    inputTimezone
  );

  return (
    <>
      <section className="profile-hero">
        <button className="profile-back" type="button" onClick={onBack}>
          ← Back to mentors
        </button>
        <div className="profile-hero-copy">
          <span className="eyebrow">{mentor.specialty} mentor</span>
          <h1>
            Learn from <em>{mentor.name}.</em>
          </h1>
          <p>
            {mentor.role} · {mentor.experience} of experience
          </p>
          <div className="profile-rating">
            <strong>
              {mentor.ratingCount
                ? `★ ${mentor.rating.toFixed(1)}`
                : "New mentor"}
            </strong>
            <span>
              {mentor.ratingCount
                ? `Based on ${mentor.ratingCount} reviews`
                : "No reviews yet"}
            </span>
            <span>·</span>
            <span>{mentor.location}</span>
            {mentor.charges !== undefined && (
              <>
                <span>·</span>
                <span>
                  {mentor.isFreeSessionEnabled ? "Free Trial Available" : `$${mentor.charges}/session`}
                </span>
              </>
            )}
          </div>
          <div className="mentor-booking-availability">
            <strong>Weekly availability</strong>
            {mentor.availability?.length ? (
              <span>Upcoming session times use your computer&apos;s clock.</span>
            ) : (
              <span>This mentor has not opened any booking times yet.</span>
            )}
          </div>
          <button
            className="button large"
            type="button"
            onClick={handleBookClick}
            disabled={
              !mentor.availability?.length ||
              Boolean(currentUser && !currentUser.access.includes("student"))
            }
          >
            {!mentor.availability?.length
              ? "No times available"
              : currentUser && !currentUser.access.includes("student")
                ? "Students can book sessions"
                : "Book a session"}{" "}
            {mentor.availability?.length && <span aria-hidden="true">↗</span>}
          </button>
        </div>
        <div className="profile-portrait">
          <div className="portrait-accent" />
          <img src={mentor.image} alt={mentor.name} />
        </div>
      </section>

      <section className="profile-content">
        <div className="profile-about">
          <span className="eyebrow">A little about me</span>
          <h2>
            Experience that
            <br />
            <em>moves you forward.</em>
          </h2>
          <p>
            {mentor.aboutMe ||
              "This mentor has not added an introduction yet."}
          </p>
          <div className="profile-stats">
            <div>
              <strong>{mentor.experience}</strong>
              <span>Experience</span>
            </div>
            <div>
              <strong>{sessionCount}</strong>
              <span>Sessions hosted</span>
            </div>
          </div>
          <button
            className="button"
            type="button"
            onClick={handleBookClick}
            disabled={
              !mentor.availability?.length ||
              Boolean(currentUser && !currentUser.access.includes("student"))
            }
          >
            {mentor.availability?.length
              ? `Contact ${mentor.name.split(" ")[0]}`
              : "No booking times available"}{" "}
            {mentor.availability?.length && <span aria-hidden="true">→</span>}
          </button>
        </div>
        <div className="expertise-panel">
          <div className="expertise-grid">
            {(mentorTopics.length ? mentorTopics : [mentor.specialty]).map((item, index) => (
              <div className="expertise-item" key={`${item}-${index}`}>
                <span className="expertise-icon" aria-hidden="true">
                  {["✣", "⌘", "◎", "♧"][index % 4]}
                </span>
                <span>{item}</span>
              </div>
            ))}
          </div>
          <div className="profile-contact">
            <span>
              ◷{" "}
              {mentor.available
                ? "Accepting session requests"
                : "Not accepting session requests"}
            </span>
          </div>
        </div>
      </section>

      <SiteFooter onMentorsClick={onBack} onHomeClick={onHomeClick} />

      {/* Session Booking Modal */}
      {isBookingOpen && (
        <div
          className="modal-backdrop session-booking-backdrop"
          onClick={() => !bookingLoading && setIsBookingOpen(false)}
        >
          <div
            className="auth-modal session-booking-modal"
            onClick={(event) => event.stopPropagation()}
            style={{ maxWidth: 480 }}
          >
            <button
              className="modal-close"
              type="button"
              onClick={() => setIsBookingOpen(false)}
              aria-label="Close"
            >
              ×
            </button>

            {bookingSuccess ? (
              <div style={{ textAlign: "center", padding: "16px 0" }}>
                <span style={{ fontSize: 42, display: "block", marginBottom: 12 }}>🎉</span>
                <h3 style={{ margin: "0 0 8px" }}>Session Request Sent!</h3>
                <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.5, marginBottom: 24 }}>
                  Your request has been submitted to <strong>{mentor.name}</strong>. Once accepted,
                  you can connect and chat directly in your messages room.
                </p>
                {bookingTimePreview && (
                  <p className="booking-timezone-help">
                  Session time: {bookingTimePreview}
                  </p>
                )}
                <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                  <button
                    className="button"
                    type="button"
                    onClick={() => {
                      setIsBookingOpen(false);
                      navigate(
                        bookingSessionId
                          ? `/chat?sessionId=${bookingSessionId}`
                          : "/student-dashboard"
                      );
                    }}
                  >
                    Open session conversation ↗
                  </button>
                  <button
                    className="button outline"
                    type="button"
                    onClick={() => setIsBookingOpen(false)}
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form
                className="session-booking-form"
                onSubmit={handleBookingSubmit}
              >
                <div className="auth-intro">
                  <h2>Book Session</h2>
                  <p>
                    Schedule a video mentorship session with <strong>{mentor.name}</strong>.
                    Enter the time using your computer&apos;s clock.
                  </p>
                </div>

                {bookingError && (
                  <div
                    style={{
                      background: "#fee2e2",
                      color: "#991b1b",
                      padding: "8px 12px",
                      borderRadius: 4,
                      fontSize: 13,
                      marginBottom: 16,
                    }}
                  >
                    {bookingError}
                  </div>
                )}

                <label>
                  Session Topic
                  <input
                    type="text"
                    required
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Portfolio feedback & resume strategy"
                  />
                </label>

                <label>
                  Suggested available times
                  <select
                    value={scheduledAt}
                    onChange={(event) => {
                      setScheduledAt(event.target.value);
                      setBookingError("");
                    }}
                  >
                    <option value="">Choose a suggested time</option>
                    {availabilityOptions.map((option) => (
                      <option
                        key={option.startsAt.toISOString()}
                        value={option.value}
                      >
                        {formatDateTimeForInputZone(
                          option.startsAt,
                          inputTimezone
                        )}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="booking-timezone-help">
                  Times use your computer&apos;s local clock. Existing bookings
                  are checked when you submit.
                  {availabilityOptions.length === 0 &&
                    " No upcoming slots fit this duration in the next 14 days; try another duration or enter a time manually."}
                </p>

                <label>
                  Or enter date & time manually
                  <input
                    type="datetime-local"
                    required
                    value={scheduledAt}
                    onChange={(e) => {
                      setScheduledAt(e.target.value);
                      setBookingError("");
                    }}
                    min={formatDateTimeInputInZone(new Date(), inputTimezone)}
                  />
                </label>
                {bookingTimePreview && (
                  <p className="booking-timezone-help">
                    Session time: {bookingTimePreview}
                  </p>
                )}

                <label>
                  Duration
                  <select
                    value={durationMinutes}
                    onChange={(event) => {
                      const nextDuration = Number(event.target.value);
                      const nextOptions = getUpcomingAvailabilityOptions(
                        mentor.availability ?? [],
                        availabilityTimezone,
                        inputTimezone,
                        nextDuration
                      );
                      setDurationMinutes(nextDuration);
                      setScheduledAt(nextOptions[0]?.value ?? "");
                      setBookingError("");
                    }}
                    style={{
                      width: "100%",
                      padding: "10px",
                      border: "1px solid var(--border, #ccc)",
                      background: "var(--surface)",
                      color: "var(--ink)",
                      marginBottom: 16,
                    }}
                  >
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>60 minutes</option>
                  </select>
                </label>

                <label>
                  Notes / Questions for Mentor (Optional)
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Provide context or questions you want to cover..."
                    style={{
                      width: "100%",
                      padding: "10px",
                      border: "1px solid var(--border, #ccc)",
                      background: "var(--surface)",
                      color: "var(--ink)",
                      marginBottom: 20,
                      fontFamily: "inherit",
                    }}
                  />
                </label>

                <div className="session-booking-actions">
                  <button
                    className="button outline"
                    type="button"
                    disabled={bookingLoading}
                    onClick={() => setIsBookingOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="button"
                    type="submit"
                    disabled={bookingLoading}
                  >
                    {bookingLoading
                      ? "Submitting Request..."
                      : "Confirm & Request Session"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};
