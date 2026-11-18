import type { Session } from "../sessionData";

type SessionCardProps = {
  session: Session;
  onAction: (session: Session) => void;
};

export const SessionCard = ({ session, onAction }: SessionCardProps) => (
  <article className="session-card">
    <span className={`session-avatar ${session.tone}`}>{session.initials}</span>
    <div className="session-card-info">
      <div className="session-card-title">
        <h3>{session.topic}</h3>
        <span className={`session-badge ${session.status.toLowerCase()}`}>
          {session.status}
        </span>
      </div>
      <p>
        with <strong>{session.student}</strong>
      </p>
      <div className="session-details">
        <span>
          ◷ {session.date}, {session.time}
        </span>
        <span>◌ {session.duration}</span>
        <span>▣ {session.mode}</span>
      </div>
    </div>
    <button
      className={
        session.status === "Live"
          ? "button session-action live"
          : "button session-action"
      }
      type="button"
      onClick={() => onAction(session)}
    >
      {session.status === "Past"
        ? "View notes"
        : session.status === "Live"
          ? "Join session"
          : "View details"}{" "}
      <span aria-hidden="true">↗</span>
    </button>
  </article>
);
