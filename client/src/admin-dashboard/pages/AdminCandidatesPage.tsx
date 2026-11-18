import { useMemo, useState } from "react";

type Candidate = {
  id: string;
  name: string;
  email: string;
  goal: string;
  joined: string;
  sessions: number;
  status: "Active" | "Pending";
  image: string;
};

const candidates: Candidate[] = [
  {
    id: "MC-1048",
    name: "Priya Shah",
    email: "priya.shah@email.com",
    goal: "Product design",
    joined: "Sep 04, 2026",
    sessions: 8,
    status: "Active",
    image: "https://i.pravatar.cc/80?img=44",
  },
  {
    id: "MC-1047",
    name: "Noah Williams",
    email: "noah.w@email.com",
    goal: "Career transition",
    joined: "Sep 03, 2026",
    sessions: 3,
    status: "Active",
    image: "https://i.pravatar.cc/80?img=14",
  },
  {
    id: "MC-1046",
    name: "Amara Okafor",
    email: "amara.o@email.com",
    goal: "Data and AI",
    joined: "Sep 01, 2026",
    sessions: 12,
    status: "Active",
    image: "https://i.pravatar.cc/80?img=25",
  },
  {
    id: "MC-1045",
    name: "Lucas Martin",
    email: "lucas.m@email.com",
    goal: "Engineering",
    joined: "Aug 30, 2026",
    sessions: 0,
    status: "Pending",
    image: "https://i.pravatar.cc/80?img=57",
  },
  {
    id: "MC-1044",
    name: "Sofia Rossi",
    email: "sofia.rossi@email.com",
    goal: "Entrepreneurship",
    joined: "Aug 28, 2026",
    sessions: 6,
    status: "Active",
    image: "https://i.pravatar.cc/80?img=48",
  },
  {
    id: "MC-1043",
    name: "Ethan Cole",
    email: "ethan.cole@email.com",
    goal: "Marketing",
    joined: "Aug 26, 2026",
    sessions: 4,
    status: "Active",
    image: "https://i.pravatar.cc/80?img=59",
  },
];

export const AdminCandidatesPage = () => {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All candidates");
  const filteredCandidates = useMemo(
    () =>
      candidates.filter((candidate) => {
        const searchable =
          `${candidate.name} ${candidate.email} ${candidate.goal}`.toLowerCase();
        return (
          searchable.includes(query.toLowerCase()) &&
          (status === "All candidates" || candidate.status === status)
        );
      }),
    [query, status],
  );

  return (
    <section className="admin-directory">
      <div className="admin-page-heading">
        <div>
          <span className="eyebrow">Community management</span>
          <h2>Candidate listing</h2>
          <p>Keep track of everyone growing with mentorconnect.</p>
        </div>
        <button className="admin-action-button" type="button">
          + Add candidate
        </button>
      </div>
      <div className="admin-stat-row">
        <div>
          <span>Total candidates</span>
          <strong>1,248</strong>
          <small>+8.4% this month</small>
        </div>
        <div>
          <span>Active this week</span>
          <strong>864</strong>
          <small>69% engagement</small>
        </div>
        <div>
          <span>Needs attention</span>
          <strong>24</strong>
          <small>Pending profiles</small>
        </div>
      </div>
      <div className="admin-list-panel">
        <div className="admin-list-toolbar">
          <label className="admin-search">
            <span aria-hidden="true">⌕</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search candidates"
              aria-label="Search candidates"
            />
          </label>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            aria-label="Filter candidates by status"
          >
            <option>All candidates</option>
            <option>Active</option>
            <option>Pending</option>
          </select>
          <button className="admin-filter-button" type="button">
            Filter <span aria-hidden="true">⌄</span>
          </button>
        </div>
        <div className="admin-list-meta">
          <strong>{filteredCandidates.length} recent candidates</strong>
          <span>Updated just now</span>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Learning goal</th>
                <th>Joined</th>
                <th>Sessions</th>
                <th>Status</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredCandidates.map((candidate) => (
                <tr key={candidate.id}>
                  <td>
                    <div className="admin-person">
                      <img src={candidate.image} alt="" />
                      <div>
                        <strong>{candidate.name}</strong>
                        <span>
                          {candidate.email} · {candidate.id}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td>{candidate.goal}</td>
                  <td>{candidate.joined}</td>
                  <td>{candidate.sessions}</td>
                  <td>
                    <span
                      className={`admin-status ${candidate.status.toLowerCase()}`}
                    >
                      {candidate.status}
                    </span>
                  </td>
                  <td>
                    <button
                      className="admin-more-button"
                      type="button"
                      aria-label={`Open actions for ${candidate.name}`}
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
