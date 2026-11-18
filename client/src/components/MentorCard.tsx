import type { Mentor } from "../data/mentors";

type MentorCardProps = { mentor: Mentor; onConnect: (mentor: Mentor) => void };

export const MentorCard = ({ mentor, onConnect }: MentorCardProps) => (
  <article className="mentor-card">
    <div className="mentor-card-top">
      <img src={mentor.image} alt={mentor.name} className="mentor-image" />
      <span className={mentor.available ? "availability" : "availability away"}>
        <i />
        {mentor.available
          ? "Available"
          : mentor.availability?.length
            ? "Not accepting"
            : "No times set"}
      </span>
    </div>
    <div className="mentor-card-body">
      <div className="mentor-heading">
        <div>
          <h3>{mentor.name}</h3>
          <p>{mentor.role}</p>
        </div>
        <span className="rating">
          {mentor.ratingCount
            ? `★ ${mentor.rating.toFixed(1)} (${mentor.ratingCount})`
            : "New mentor"}
        </span>
      </div>
      <p className="company">
        {mentor.company} <span>·</span> {mentor.location}
      </p>
      <div className="mentor-tags">
        <span>{mentor.specialty}</span>
        <span>{mentor.experience}</span>
      </div>
      <div className="mentor-card-footer">
        <span className="sessions">{mentor.sessions} sessions</span>
        <button
          className="button outline"
          type="button"
          onClick={() => onConnect(mentor)}
        >
          View profile <span aria-hidden="true">↗</span>
        </button>
      </div>
    </div>
  </article>
);
