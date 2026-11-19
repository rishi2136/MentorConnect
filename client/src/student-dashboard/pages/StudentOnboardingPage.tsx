import { useState, type FormEvent } from "react";
import "./StudentOnboardingPage.css";
import { apiUrl } from "../../config/api";

type StudentOnboardingPageProps = {
  onComplete: () => void;
};

type StudentProfileInput = {
  collegeName: string;
  yearStart: number;
  yearEnd: number;
  course: string;
  batch: string;
  experienceSummary: string;
};

export const StudentOnboardingPage = ({
  onComplete,
}: StudentOnboardingPageProps) => {
  const currentYear = new Date().getFullYear();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [yearStart, setYearStart] = useState(currentYear);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const profile: StudentProfileInput = {
      collegeName: String(formData.get("collegeName") ?? "").trim(),
      yearStart: Number(formData.get("yearStart")),
      yearEnd: Number(formData.get("yearEnd")),
      course: String(formData.get("course") ?? "").trim(),
      batch: String(formData.get("batch") ?? "").trim(),
      experienceSummary: String(formData.get("experienceSummary") ?? "").trim(),
    };

    try {
      const response = await fetch(apiUrl("/api/students"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(
          result.message ?? "Could not save your student profile.",
        );
      }
      onComplete();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not save your student profile.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="student-onboarding">
      <section className="student-onboarding-card">
        <div className="student-onboarding-intro">
          <span className="eyebrow">A few details before you begin</span>
          <h1>
            Let&apos;s make your mentorship <em>personal.</em>
          </h1>
          <p>
            Tell us about your studies and goals so mentors can make your
            sessions relevant to you. You can update these details later.
          </p>
          <div className="student-onboarding-progress" aria-label="Step 1 of 1">
            <span />
            <small>Student profile · required once</small>
          </div>
        </div>

        <form className="student-onboarding-form" onSubmit={handleSubmit}>
          <div className="student-onboarding-fields">
            <label>
              College or institution
              <input
                autoComplete="organization"
                name="collegeName"
                type="text"
                minLength={2}
                maxLength={150}
                placeholder="e.g. Northview University"
                required
              />
            </label>

            <label>
              Course or program
              <input
                name="course"
                type="text"
                minLength={2}
                maxLength={100}
                placeholder="e.g. B.Tech in Computer Science"
                required
              />
            </label>

            <label>
              Batch or class
              <input
                name="batch"
                type="text"
                minLength={1}
                maxLength={50}
                placeholder="e.g. 2024–2028"
                required
              />
            </label>

            <div className="student-onboarding-year-fields">
              <label>
                Start year
                <input
                  name="yearStart"
                  type="number"
                  min={2000}
                  max={currentYear + 10}
                  value={yearStart}
                  onChange={(event) => setYearStart(Number(event.target.value))}
                  required
                />
              </label>
              <label>
                Expected graduation year
                <input
                  name="yearEnd"
                  type="number"
                  min={yearStart}
                  max={currentYear + 15}
                  defaultValue={currentYear + 4}
                  required
                />
              </label>
            </div>

            <label className="student-onboarding-full-width">
              What would you like help with? <span>Optional</span>
              <textarea
                name="experienceSummary"
                rows={4}
                maxLength={500}
                placeholder="Share your interests, current challenges, or what you hope to achieve."
              />
            </label>
          </div>

          {error && (
            <p className="student-onboarding-error" role="alert">
              {error}
            </p>
          )}

          <div className="student-onboarding-footer">
            <p>
              Your profile is only shared to support your mentoring sessions.
            </p>
            <button className="button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving profile..." : "Save and continue"}
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </form>
      </section>
    </main>
  );
};
