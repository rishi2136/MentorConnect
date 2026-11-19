import { useEffect, useMemo, useState } from "react";
import type { AuthMode } from "../App";
import { MentorCard } from "../components/MentorCard";
import type { Mentor } from "../data/mentors";
import { useMentorSessionStats } from "../contexts/useMentorSessionStats";
import "./MentorsPage.css";
import { apiUrl } from "../config/api";

type MentorsPageProps = {
  onAuthOpen: (mode: AuthMode) => void;
  onMentorSelect: (mentor: Mentor) => void;
};

// Shape of populated mentor profiles returned from GET /api/mentors/search
type ApiMentorProfile = {
  _id: string;
  userId?: {
    _id: string;
    fullName: string;
    username: string;
    profilePic?: { url: string };
  };
  yearsOfExperience: number;
  aboutMe?: string;
  expertise?: string[];
  languages?: string[];
  skills?: string[];
  charges?: number;
  isCharged?: boolean;
  isFreeSessionEnabled?: boolean;
  isAvailable?: boolean;
  rating?: number;
  ratingCount?: number;
  sessionCount?: number;
  timezone?: string;
  availability?: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }>;
};

export const MentorsPage = ({
  onAuthOpen,
  onMentorSelect,
}: MentorsPageProps) => {
  const { mentorSessionCounts, setMentorSessionCounts } =
    useMentorSessionStats();
  const [query, setQuery] = useState("");
  const [specialty, setSpecialty] = useState("All specialties");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [apiMentors, setApiMentors] = useState<Mentor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  /**
   * Fetch mentors from the backend API: GET /api/mentors/search
   * Uses search query (q) and domain filter if specified.
   */
  useEffect(() => {
    let isActive = true;
    const fetchApiMentors = async () => {
      setIsLoading(true);
      setSearchError("");
      try {
        const params = new URLSearchParams();
        if (query.trim()) params.append("q", query.trim());
        if (specialty !== "All specialties") params.append("domain", specialty);

        const response = await fetch(apiUrl(`/api/mentors/search?${params.toString()}`));
        if (!response.ok) throw new Error("Search request failed");

        const data = (await response.json()) as {
          profiles: ApiMentorProfile[];
          total: number;
        };

        if (isActive) {
          // Map backend documents to Mentor UI shape
          const mapped: Mentor[] = (data.profiles || []).map((profile, index) => {
            const domain = profile.expertise?.[0] || "General Mentoring";
            const mentorName = profile.userId?.fullName || "Registered Mentor";
            return {
              id: profile._id,
              profileId: profile._id,
              name: mentorName,
              role: profile.expertise?.slice(0, 2).join(" & ") || "Specialist",
              company: "MentorConnect",
              specialty: domain,
              location: "Online",
              experience: `${profile.yearsOfExperience} years`,
              rating: profile.rating ?? 0,
              ratingCount: profile.ratingCount ?? 0,
              sessions: profile.sessionCount ?? 0,
              image:
                profile.userId?.profilePic?.url ||
                `https://i.pravatar.cc/160?img=${(index % 60) + 10}`,
              available:
                (profile.isAvailable ?? true) &&
                Boolean(profile.availability?.length),
              charges: profile.charges,
              isFreeSessionEnabled: profile.isFreeSessionEnabled,
              aboutMe: profile.aboutMe,
              timezone: profile.timezone,
              availability: profile.availability ?? [],
              expertise: profile.expertise ?? [],
              skills: profile.skills ?? [],
            };
          });

          setMentorSessionCounts(
            Object.fromEntries(
              mapped.flatMap((mentor) =>
                mentor.profileId
                  ? [[mentor.profileId, mentor.sessions] as const]
                  : []
              )
            )
          );
          setApiMentors(mapped);
        }
      } catch (error) {
        if (isActive) {
          setApiMentors([]);
          setSearchError(
            error instanceof Error ? error.message : "Could not load mentors."
          );
        }
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    const timeout = setTimeout(() => {
      void fetchApiMentors();
    }, 200);

    return () => {
      isActive = false;
      clearTimeout(timeout);
    };
  }, [query, specialty, retryCount, setMentorSessionCounts]);

  // Compute specialties from real database mentors only
  const availableSpecialties = useMemo(() => {
    const list = new Set<string>();
    apiMentors.forEach((m) => {
      if (m.specialty) list.add(m.specialty);
    });
    return ["All specialties", ...list];
  }, [apiMentors]);

  // Apply client-side filters (name search + specialty + availability)
  const filteredMentors = useMemo(
    () =>
      apiMentors
        .map((mentor) => ({
          ...mentor,
          sessions: mentor.profileId
            ? mentorSessionCounts[mentor.profileId] ?? mentor.sessions
            : mentor.sessions,
        }))
        .filter((mentor) => {
          const matchesQuery =
            `${mentor.name} ${mentor.role} ${mentor.company} ${mentor.specialty}`
              .toLowerCase()
              .includes(query.toLowerCase());
          return (
            matchesQuery &&
            (specialty === "All specialties" ||
              mentor.specialty === specialty) &&
            (!availableOnly || mentor.available)
          );
        }),
    [apiMentors, mentorSessionCounts, query, specialty, availableOnly],
  );

  return (
    <section className="directory-section">
      <div className="directory-heading">
        <div>
          <span className="eyebrow">The right perspective</span>
          <h1>
            Meet your <em>mentor.</em>
          </h1>
          <p>People who have solved the problems you are facing now.</p>
        </div>
        <button
          className="button small"
          type="button"
          onClick={() => onAuthOpen("signup")}
        >
          Join the community <span aria-hidden="true">↗</span>
        </button>
      </div>
      <div className="filter-bar">
        <label className="search-field">
          <span aria-hidden="true">⌕</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, role, or skill"
            aria-label="Search mentors"
          />
        </label>
        <select
          value={specialty}
          onChange={(event) => setSpecialty(event.target.value)}
          aria-label="Filter by specialty"
        >
          {availableSpecialties.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <label className="availability-filter">
          <input
            type="checkbox"
            checked={availableOnly}
            onChange={(event) => setAvailableOnly(event.target.checked)}
          />{" "}
          Available now
        </label>
      </div>
      <div className="results-meta">
        <span>
          <strong>{filteredMentors.length}</strong> mentors found
          {isLoading && " (searching...)"}
        </span>
        <span>
          Sorted by <strong>Recommended</strong>⌄
        </span>
      </div>
      {searchError ? (
        <div className="empty-state" role="alert">
          <span>!</span>
          <h2>Unable to load mentors</h2>
          <p>{searchError}</p>
          <button
            className="button outline"
            type="button"
            onClick={() => setRetryCount((count) => count + 1)}
          >
            Try again
          </button>
        </div>
      ) : filteredMentors.length > 0 ? (
        <div className="mentor-grid">
          {filteredMentors.map((mentor) => (
            <MentorCard
              key={mentor.id}
              mentor={mentor}
              onConnect={onMentorSelect}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <span>⌕</span>
          <h2>No mentors found</h2>
          <p>
            {query || specialty !== "All specialties" || availableOnly
              ? "Try a different search or clear your filters."
              : "No mentors are registered on the platform yet."}
          </p>
          {(query || specialty !== "All specialties" || availableOnly) && (
            <button
              className="button outline"
              type="button"
              onClick={() => {
                setQuery("");
                setSpecialty("All specialties");
                setAvailableOnly(false);
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      )}
    </section>
  );
};
