import { useEffect, useState } from "react";
import {
  DEFAULT_TIME_ZONE,
  getBrowserTimeZone,
  isValidTimeZone,
} from "../../utils/timezone";
import { useMentorSessionStats } from "../../contexts/useMentorSessionStats";
import "../MentorDashboard.css";

type ProfileRowProps = {
  left: string;
  right: string | number | React.ReactNode;
};

const ProfileRow = ({ left, right }: ProfileRowProps) => (
  <div className="profile-detail-row">
    <div className="profile-detail-label">{left}</div>
    <div className="profile-detail-value">{right}</div>
  </div>
);

type UserData = {
  id: string;
  fullName: string;
  email: string;
  username: string;
  access: Array<"student" | "mentor" | "admin">;
};

type AvailabilitySlot = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

type MentorProfileData = {
  _id?: string;
  sessionCount?: number;
  yearsOfExperience?: number;
  aboutMe?: string;
  expertise?: string[];
  skills?: string[];
  charges?: number;
  isCharged?: boolean;
  isFreeSessionEnabled?: boolean;
  isAvailable?: boolean;
  timezone?: string;
  availability?: AvailabilitySlot[];
};

type StudentProfileData = {
  collegeName?: string;
  yearStart?: number;
  yearEnd?: number;
  course?: string;
  batch?: string;
  experienceSummary?: string;
};

const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const ProfileSection = () => {
  const { mentorSessionCounts, setMentorSessionCounts } =
    useMentorSessionStats();
  const [user, setUser] = useState<UserData | null>(null);
  const [mentorProfile, setMentorProfile] = useState<MentorProfileData | null>(null);
  const [studentProfile, setStudentProfile] = useState<StudentProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);

  // Mentor editable form state
  const [yearsOfExperience, setYearsOfExperience] = useState<number>(5);
  const [aboutMe, setAboutMe] = useState("");
  const [charges, setCharges] = useState<number>(30);
  const [isFreeSessionEnabled, setIsFreeSessionEnabled] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);
  const [expertiseStr, setExpertiseStr] = useState("");
  const [skillsStr, setSkillsStr] = useState("");
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [timezone, setTimezone] = useState(getBrowserTimeZone);

  // Student editable form state
  const [collegeName, setCollegeName] = useState("");
  const [yearStart, setYearStart] = useState<number>(2022);
  const [yearEnd, setYearEnd] = useState<number>(2026);
  const [course, setCourse] = useState("");
  const [batch, setBatch] = useState("");
  const [experienceSummary, setExperienceSummary] = useState("");

  /**
   * Refetch current profile data on mount or after save
   */
  useEffect(() => {
    let isActive = true;

    const fetchProfile = async () => {
      try {
        const userRes = await fetch("/api/users/me", { credentials: "include" });
        if (!userRes.ok) {
          throw new Error("Could not load your account details.");
        }
        const { user: userData } = (await userRes.json()) as { user: UserData };
        if (!isActive) return;
        setUser(userData);

        if (userData.access.includes("mentor")) {
          const mentorRes = await fetch("/api/mentors/me", { credentials: "include" });
          if (!mentorRes.ok) {
            throw new Error("Could not load your mentor profile.");
          }
          const { profile } = (await mentorRes.json()) as { profile: MentorProfileData };
          if (!isActive) return;
          setMentorProfile(profile);
          if (profile._id && typeof profile.sessionCount === "number") {
            setMentorSessionCounts({ [profile._id]: profile.sessionCount });
          }
          setYearsOfExperience(profile.yearsOfExperience ?? 0);
          setAboutMe(profile.aboutMe ?? "");
          setCharges(profile.charges ?? 0);
          setIsFreeSessionEnabled(profile.isFreeSessionEnabled ?? false);
          setIsAvailable(profile.isAvailable ?? true);
          setExpertiseStr(profile.expertise?.join(", ") ?? "");
          setSkillsStr(profile.skills?.join(", ") ?? "");
          setAvailability(profile.availability ?? []);
          setTimezone(profile.timezone ?? DEFAULT_TIME_ZONE);
        } else if (userData.access.includes("student")) {
          const studentRes = await fetch("/api/students/me", { credentials: "include" });
          if (!studentRes.ok) {
            throw new Error("Could not load your student profile.");
          }
          const { profile } = (await studentRes.json()) as { profile: StudentProfileData };
          if (!isActive) return;
          setStudentProfile(profile);
          setCollegeName(profile.collegeName ?? "");
          setYearStart(profile.yearStart ?? 2022);
          setYearEnd(profile.yearEnd ?? 2026);
          setCourse(profile.course ?? "");
          setBatch(profile.batch ?? "");
          setExperienceSummary(profile.experienceSummary ?? "");
        }
      } catch (error) {
        if (isActive) {
          setLoadError(
            error instanceof Error ? error.message : "Could not load your profile."
          );
        }
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    void fetchProfile();

    return () => {
      isActive = false;
    };
  }, [loadAttempt, setMentorSessionCounts]);

  const refreshProfileAfterSave = async () => {
    const endpoint = user?.access.includes("mentor")
      ? "/api/mentors/me"
      : "/api/students/me";
    const response = await fetch(endpoint, { credentials: "include" });
    if (!response.ok) throw new Error("Profile saved, but could not reload it.");

    if (user?.access.includes("mentor")) {
      const { profile } = (await response.json()) as { profile: MentorProfileData };
      setMentorProfile(profile);
      setAvailability(profile.availability ?? []);
      setTimezone(profile.timezone ?? DEFAULT_TIME_ZONE);
    } else {
      const { profile } = (await response.json()) as { profile: StudentProfileData };
      setStudentProfile(profile);
    }
  };

  /**
   * Save updated profile via PUT (or POST if initial profile)
   */
  const handleSaveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaveLoading(true);
    setMessage(null);

    try {
      const isMentorUser = user?.access.includes("mentor");
      if (
        isMentorUser &&
        availability.some((slot) => slot.endTime <= slot.startTime)
      ) {
        throw new Error("Each availability end time must be later than its start time.");
      }
      if (isMentorUser && !isValidTimeZone(timezone.trim())) {
        throw new Error("Enter a valid IANA timezone, such as America/Los_Angeles.");
      }
      const endpoint = isMentorUser ? "/api/mentors" : "/api/students";
      const hasExisting = isMentorUser ? Boolean(mentorProfile) : Boolean(studentProfile);

      const payload = isMentorUser
        ? {
            yearsOfExperience: Number(yearsOfExperience),
            aboutMe: aboutMe.trim(),
            charges: Number(charges),
            isAvailable,
            timezone: timezone.trim(),
            expertise: expertiseStr
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            skills: skillsStr
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            availability,
          }
        : {
            collegeName: collegeName.trim(),
            yearStart: Number(yearStart),
            yearEnd: Number(yearEnd),
            course: course.trim(),
            batch: batch.trim(),
            experienceSummary: experienceSummary.trim(),
          };

      const response = await fetch(hasExisting ? `${endpoint}/me` : endpoint, {
        method: hasExisting ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = (await response.json()) as { message?: string };
        throw new Error(errData.message || "Failed to update profile");
      }

      if (
        isMentorUser &&
        mentorProfile &&
        mentorProfile.isFreeSessionEnabled !== isFreeSessionEnabled
      ) {
        const freeSessionResponse = await fetch("/api/mentors/me/free-session", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ enabled: isFreeSessionEnabled }),
        });
        if (!freeSessionResponse.ok) {
          const result = (await freeSessionResponse.json()) as { message?: string };
          throw new Error(result.message ?? "Could not update the free-session setting.");
        }
      }

      await refreshProfileAfterSave();
      setMessage({ type: "success", text: "Profile updated successfully!" });
      setIsEditing(false);
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Error saving profile",
      });
    } finally {
      setSaveLoading(false);
    }
  };

  const updateAvailabilitySlot = (
    index: number,
    field: keyof AvailabilitySlot,
    value: string
  ) => {
    setAvailability((current) =>
      current.map((slot, slotIndex) =>
        slotIndex === index
          ? {
              ...slot,
              [field]: field === "dayOfWeek" ? Number(value) : value,
            }
          : slot
      )
    );
  };

  const isMentor = user?.access.includes("mentor") ?? false;
  const displayName = user?.fullName || "Account";
  const displayEmail = user?.email || "";
  const displayRole = user?.access.join(", ") || "Member";
  const avatarLetter = displayName[0]?.toUpperCase() || "M";

  if (isLoading) {
    return <div className="chat-workspace-placeholder">Loading your profile...</div>;
  }

  return (
    <div className="profile-page-shell">
      <div className="profile-page-header">
        <div className="profile-tab-row">
          <button type="button" className="profile-tab active">
            Profile Details
          </button>
        </div>
      </div>

      {message && (
        <div
          style={{
            margin: "0 0 16px",
            padding: "10px 16px",
            borderRadius: 6,
            background: message.type === "success" ? "#dcfce7" : "#fee2e2",
            color: message.type === "success" ? "#166534" : "#991b1b",
            fontSize: 13,
          }}
        >
          {message.text}
        </div>
      )}
      {loadError && (
        <div className="profile-error" role="alert">
          {loadError}
          <button
            className="button outline small"
            type="button"
            onClick={() => {
              setIsLoading(true);
              setLoadError("");
              setLoadAttempt((attempt) => attempt + 1);
            }}
          >
            Try again
          </button>
        </div>
      )}

      <div className="profile-content-grid">
        <aside className="profile-sidebar-card">
          <div className="profile-avatar-wrap">
            <div className="profile-avatar">{avatarLetter}</div>
          </div>

          <h3>{displayName}</h3>
          <p className="profile-role" style={{ textTransform: "capitalize" }}>
            {displayRole}
          </p>

          <div className="profile-stats-grid">
            <div className="profile-stat-item">
              <strong>{isMentor ? mentorProfile?.yearsOfExperience ?? "—" : studentProfile?.yearStart ?? "—"}</strong>
              <span>{isMentor ? "Years Exp" : "Cohort"}</span>
            </div>
            <div className="profile-stat-item">
              <strong>{isMentor ? (mentorProfile?.isAvailable ? "Active" : "Away") : "Active"}</strong>
              <span>Status</span>
            </div>
            <div className="profile-stat-item">
              <strong>{isMentor ? mentorProfile?.charges === undefined ? "—" : `$${mentorProfile.charges}` : studentProfile ? "Enrolled" : "—"}</strong>
              <span>{isMentor ? "Rate" : "Standing"}</span>
            </div>
          </div>

          <div className="profile-contact-list">
            <div className="profile-contact-row">
              <span aria-hidden="true">✉</span>
              <span>{displayEmail}</span>
            </div>
            <div className="profile-contact-row">
              <span aria-hidden="true">👤</span>
              <span>@{user?.username || "user"}</span>
            </div>
            <div className="profile-contact-row">
              <span aria-hidden="true">⌂</span>
              <span>
                {isMentor
                  ? `Mentor timezone: ${mentorProfile?.timezone ?? DEFAULT_TIME_ZONE}`
                  : `Your timezone: ${getBrowserTimeZone()}`}
              </span>
            </div>
          </div>

          <div style={{ marginTop: 24 }}>
            <button
              className="button outline small"
              type="button"
              style={{ width: "100%" }}
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? "Cancel Edit" : "✎ Edit Profile"}
            </button>
          </div>
        </aside>

        <main className="profile-main-panel">
          {isEditing ? (
            /* Editable Form View */
            <form onSubmit={handleSaveProfile} className="profile-section-block">
              <h4 style={{ marginBottom: 16 }}>Edit {isMentor ? "Mentor" : "Student"} Profile</h4>

              {isMentor ? (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                    <label style={{ display: "block", fontSize: 13 }}>
                      Years of Experience
                      <input
                        type="number"
                        min={0}
                        required
                        value={yearsOfExperience}
                        onChange={(e) => setYearsOfExperience(Number(e.target.value))}
                        style={{ width: "100%", padding: 8, marginTop: 4 }}
                      />
                    </label>
                    <label style={{ display: "block", fontSize: 13 }}>
                      Session Rate ($)
                      <input
                        type="number"
                        min={0}
                        required
                        value={charges}
                        onChange={(e) => setCharges(Number(e.target.value))}
                        style={{ width: "100%", padding: 8, marginTop: 4 }}
                      />
                    </label>
                  </div>

                  <label style={{ display: "block", fontSize: 13, marginBottom: 16 }}>
                    Mentor timezone (IANA)
                    <input
                      type="text"
                      required
                      value={timezone}
                      onChange={(event) => setTimezone(event.target.value)}
                      placeholder="e.g. Asia/Kolkata or America/Los_Angeles"
                      style={{ width: "100%", padding: 8, marginTop: 4 }}
                    />
                    <small>
                      Browser detected: {getBrowserTimeZone()}. Confirm or change this
                      timezone to match where you offer sessions; it does not verify
                      your physical location.
                    </small>
                  </label>
                  <button
                    className="button outline small"
                    type="button"
                    onClick={() => setTimezone(getBrowserTimeZone())}
                    style={{ marginBottom: 16 }}
                  >
                    Use detected timezone
                  </button>

                  <fieldset className="mentor-availability-editor">
                    <legend>Weekly booking availability</legend>
                    <p>
                      Weekly availability is entered in {timezone || DEFAULT_TIME_ZONE}
                      and must cover the full session duration.
                    </p>
                    {availability.map((slot, index) => (
                      <div className="mentor-availability-row" key={index}>
                        <label>
                          Day
                          <select
                            value={slot.dayOfWeek}
                            onChange={(event) =>
                              updateAvailabilitySlot(index, "dayOfWeek", event.target.value)
                            }
                          >
                            {weekdays.map((day, dayIndex) => (
                              <option key={day} value={dayIndex}>{day}</option>
                            ))}
                          </select>
                        </label>
                        <label>
                          From
                          <input
                            type="time"
                            value={slot.startTime}
                            onChange={(event) =>
                              updateAvailabilitySlot(index, "startTime", event.target.value)
                            }
                            required
                          />
                        </label>
                        <label>
                          Until
                          <input
                            type="time"
                            value={slot.endTime}
                            onChange={(event) =>
                              updateAvailabilitySlot(index, "endTime", event.target.value)
                            }
                            required
                          />
                        </label>
                        <button
                          className="button outline small"
                          type="button"
                          aria-label={`Remove ${weekdays[slot.dayOfWeek]} availability`}
                          onClick={() =>
                            setAvailability((current) =>
                              current.filter((_, slotIndex) => slotIndex !== index)
                            )
                          }
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      className="button outline small"
                      type="button"
                      onClick={() =>
                        setAvailability((current) => [
                          ...current,
                          { dayOfWeek: 1, startTime: "09:00", endTime: "17:00" },
                        ])
                      }
                    >
                      Add availability
                    </button>
                  </fieldset>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", fontSize: 13 }}>
                      Expertise / Domains (comma-separated)
                      <input
                        type="text"
                        value={expertiseStr}
                        onChange={(e) => setExpertiseStr(e.target.value)}
                        placeholder="e.g. Web Development, System Design, UX"
                        style={{ width: "100%", padding: 8, marginTop: 4 }}
                      />
                    </label>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", fontSize: 13 }}>
                      Key Skills (comma-separated)
                      <input
                        type="text"
                        value={skillsStr}
                        onChange={(e) => setSkillsStr(e.target.value)}
                        placeholder="e.g. React, Node.js, TypeScript, GraphQL"
                        style={{ width: "100%", padding: 8, marginTop: 4 }}
                      />
                    </label>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", fontSize: 13 }}>
                      About Me / Bio
                      <textarea
                        rows={4}
                        value={aboutMe}
                        onChange={(e) => setAboutMe(e.target.value)}
                        placeholder="Share your mentoring philosophy, background, and what students can learn from you..."
                        style={{ width: "100%", padding: 8, marginTop: 4, fontFamily: "inherit" }}
                      />
                    </label>
                  </div>

                  <div style={{ display: "flex", gap: 24, marginBottom: 20 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={isAvailable}
                        onChange={(e) => setIsAvailable(e.target.checked)}
                      />
                      Available for bookings
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={isFreeSessionEnabled}
                        onChange={(e) => setIsFreeSessionEnabled(e.target.checked)}
                      />
                      Offer Free Trial Sessions
                    </label>
                  </div>
                </>
              ) : (
                /* Student form fields */
                <>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", fontSize: 13 }}>
                      College / Institution Name
                      <input
                        type="text"
                        required
                        value={collegeName}
                        onChange={(e) => setCollegeName(e.target.value)}
                        placeholder="e.g. Stanford University"
                        style={{ width: "100%", padding: 8, marginTop: 4 }}
                      />
                    </label>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                    <label style={{ display: "block", fontSize: 13 }}>
                      Course / Major
                      <input
                        type="text"
                        value={course}
                        onChange={(e) => setCourse(e.target.value)}
                        placeholder="e.g. Computer Science"
                        style={{ width: "100%", padding: 8, marginTop: 4 }}
                      />
                    </label>
                    <label style={{ display: "block", fontSize: 13 }}>
                      Batch
                      <input
                        type="text"
                        value={batch}
                        onChange={(e) => setBatch(e.target.value)}
                        placeholder="e.g. 2022-2026"
                        style={{ width: "100%", padding: 8, marginTop: 4 }}
                      />
                    </label>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                    <label style={{ display: "block", fontSize: 13 }}>
                      Start Year
                      <input
                        type="number"
                        required
                        value={yearStart}
                        onChange={(e) => setYearStart(Number(e.target.value))}
                        style={{ width: "100%", padding: 8, marginTop: 4 }}
                      />
                    </label>
                    <label style={{ display: "block", fontSize: 13 }}>
                      Graduation Year
                      <input
                        type="number"
                        required
                        value={yearEnd}
                        onChange={(e) => setYearEnd(Number(e.target.value))}
                        style={{ width: "100%", padding: 8, marginTop: 4 }}
                      />
                    </label>
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: "block", fontSize: 13 }}>
                      Experience & Goals Summary
                      <textarea
                        rows={4}
                        value={experienceSummary}
                        onChange={(e) => setExperienceSummary(e.target.value)}
                        placeholder="Describe your current learning goals, projects, and what you hope to achieve with mentors..."
                        style={{ width: "100%", padding: 8, marginTop: 4, fontFamily: "inherit" }}
                      />
                    </label>
                  </div>
                </>
              )}

              <div style={{ display: "flex", gap: 12 }}>
                <button className="button" type="submit" disabled={saveLoading}>
                  {saveLoading ? "Saving..." : "Save Profile Changes"}
                </button>
                <button
                  className="button outline"
                  type="button"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            /* Read-Only Profile View */
            <>
              <div className="profile-section-block">
                <h4>About me</h4>
                <p>
                  {isMentor
                    ? mentorProfile?.aboutMe ||
                      "No introduction has been added yet."
                    : studentProfile?.experienceSummary ||
                      "No learning goals have been added yet."}
                </p>
              </div>

              <div className="profile-section-block">
                <h4>Account & Contact Details</h4>
                <div className="profile-grid-two">
                  <ProfileRow left="Full Name" right={displayName} />
                  <ProfileRow left="Email" right={displayEmail} />
                  <ProfileRow left="Role" right={<span style={{ textTransform: "capitalize" }}>{displayRole}</span>} />
                  <ProfileRow left="Status" right={isLoading ? "Checking..." : "Active"} />
                </div>
              </div>

              {isMentor ? (
                <div className="profile-section-block">
                  <h4>Mentorship Information</h4>
                  <div className="profile-grid-two">
                    <ProfileRow left="Experience" right={`${mentorProfile?.yearsOfExperience ?? "—"}${mentorProfile?.yearsOfExperience === undefined ? "" : " years"}`} />
                    <ProfileRow
                      left="Sessions hosted"
                      right={
                        mentorProfile?._id
                          ? mentorSessionCounts[mentorProfile._id] ??
                            mentorProfile.sessionCount ??
                            0
                          : mentorProfile?.sessionCount ?? 0
                      }
                    />
                    <ProfileRow left="Session Fee" right={mentorProfile?.charges === undefined ? "Not set" : `$${mentorProfile.charges} / session`} />
                    <ProfileRow left="Free Trial" right={mentorProfile?.isFreeSessionEnabled ? "Enabled" : "Disabled"} />
                    <ProfileRow left="Accepting Bookings" right={mentorProfile?.isAvailable ? "Yes" : "No"} />
                    <ProfileRow left="Expertise" right={mentorProfile?.expertise?.join(", ") || "Not set"} />
                    <ProfileRow left="Skills" right={mentorProfile?.skills?.join(", ") || "Not set"} />
                    <ProfileRow
                      left={`Weekly availability (${mentorProfile?.timezone ?? DEFAULT_TIME_ZONE})`}
                      right={
                        mentorProfile?.availability?.length
                          ? mentorProfile.availability
                              .map((slot) => `${weekdays[slot.dayOfWeek]} ${slot.startTime}–${slot.endTime}`)
                              .join(", ")
                          : "No booking times set"
                      }
                    />
                  </div>
                </div>
              ) : (
                <div className="profile-section-block">
                  <h4>Academic Details</h4>
                  <div className="profile-grid-two">
                    <ProfileRow left="College / University" right={studentProfile?.collegeName || "Not configured yet"} />
                    <ProfileRow left="Course / Major" right={studentProfile?.course || "Not set"} />
                    <ProfileRow left="Batch" right={studentProfile?.batch || "Not set"} />
                    <ProfileRow
                      left="Years"
                      right={
                        studentProfile?.yearStart && studentProfile.yearEnd
                          ? `${studentProfile.yearStart} - ${studentProfile.yearEnd}`
                          : "Not set"
                      }
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};
