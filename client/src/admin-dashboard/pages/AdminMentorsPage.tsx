import { useMemo, useState } from "react";
import { mentors } from "../../data/mentors";

export const AdminMentorsPage = () => {
  const [query, setQuery] = useState("");
  const [specialty, setSpecialty] = useState("All specialties");
  const [availability, setAvailability] = useState("Any availability");
  const specialties = [
    "All specialties",
    ...new Set(mentors.map((mentor) => mentor.specialty)),
  ];
  const filteredMentors = useMemo(
    () =>
      mentors.filter((mentor) => {
        const searchable =
          `${mentor.name} ${mentor.role} ${mentor.company} ${mentor.specialty}`.toLowerCase();
        return (
          searchable.includes(query.toLowerCase()) &&
          (specialty === "All specialties" || mentor.specialty === specialty) &&
          (availability === "Any availability" ||
            (availability === "Available"
              ? mentor.available
              : !mentor.available))
        );
      }),
    [availability, query, specialty],
  );

  return (
    <section className="admin-directory">
      <div className="admin-page-heading">
        <div>
          <span className="eyebrow">Talent network</span>
          <h2>Mentor listing</h2>
          <p>Review your mentor community and keep quality high.</p>
        </div>
        <button className="admin-action-button" type="button">
          + Invite mentor
        </button>
      </div>
      <div className="admin-stat-row">
        <div>
          <span>Total mentors</span>
          <strong>287</strong>
          <small>+5 this week</small>
        </div>
        <div>
          <span>Available now</span>
          <strong>214</strong>
          <small>75% of network</small>
        </div>
        <div>
          <span>Avg. rating</span>
          <strong>
            4.8 <i>★</i>
          </strong>
          <small>From 8,492 sessions</small>
        </div>
      </div>
      <div className="admin-list-panel">
        <div className="admin-list-toolbar">
          <label className="admin-search">
            <span aria-hidden="true">⌕</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, role, or company"
              aria-label="Search mentors"
            />
          </label>
          <select
            value={specialty}
            onChange={(event) => setSpecialty(event.target.value)}
            aria-label="Filter by specialty"
          >
            {specialties.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <select
            value={availability}
            onChange={(event) => setAvailability(event.target.value)}
            aria-label="Filter by availability"
          >
            <option>Any availability</option>
            <option>Available</option>
            <option>Away</option>
          </select>
          <button className="admin-filter-button" type="button">
            More filters <span aria-hidden="true">⌄</span>
          </button>
        </div>
        <div className="admin-list-meta">
          <strong>{filteredMentors.length} mentors found</strong>
          <span>
            Sorted by <b>Recommended</b>⌄
          </span>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Mentor</th>
                <th>Specialty</th>
                <th>Location</th>
                <th>Rating</th>
                <th>Status</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredMentors.map((mentor) => (
                <tr key={mentor.id}>
                  <td>
                    <div className="admin-person">
                      <img src={mentor.image} alt="" />
                      <div>
                        <strong>{mentor.name}</strong>
                        <span>
                          {mentor.role} · {mentor.company}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td>{mentor.specialty}</td>
                  <td>{mentor.location}</td>
                  <td>
                    <span className="admin-rating">★ {mentor.rating}</span>
                    <small className="admin-table-subtext">
                      {" "}
                      {mentor.sessions} sessions
                    </small>
                  </td>
                  <td>
                    <span
                      className={`admin-status ${mentor.available ? "active" : "away"}`}
                    >
                      {mentor.available ? "Available" : "Away"}
                    </span>
                  </td>
                  <td>
                    <button
                      className="admin-more-button"
                      type="button"
                      aria-label={`Open actions for ${mentor.name}`}
                    >
                      •••
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
