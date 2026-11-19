import { useEffect, useState, type FormEvent } from "react";
import type { AuthMode } from "../App";
import "./AuthModal.css";
import { apiUrl } from "../config/api";

export type AuthenticatedUser = {
  id: string;
  fullName: string;
  access: Array<"admin" | "mentor" | "student">;
};

type AuthModalProps = {
  mode: AuthMode;
  onClose: () => void;
  onModeChange: (mode: AuthMode) => void;
  onAuthenticated: (user: AuthenticatedUser) => void;
};

export const AuthModal = ({
  mode,
  onClose,
  onModeChange,
  onAuthenticated,
}: AuthModalProps) => {
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());
    if (mode === "login") delete payload.fullName;
    try {
      const response = await fetch(
        apiUrl(`/api/users/${mode === "login" ? "login" : "signup"}`),
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const result = (await response.json()) as {
        user?: AuthenticatedUser;
        message?: string;
      };
      if (!response.ok || !result.user) {
        throw new Error(result.message ?? "Could not authenticate your account");
      }
      onAuthenticated(result.user);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not authenticate your account"
      );
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="auth-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
      >
        <button
          className="modal-close"
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
        >
          ×
        </button>
        <div className="auth-intro">
          <span className="eyebrow">Your next chapter</span>
          <h2 id="auth-title">
            {mode === "login" ? "Welcome back." : "Start growing today."}
          </h2>
          <p>
            {mode === "login"
              ? "Pick up where you left off."
              : "Build meaningful connections with people who have been there."}
          </p>
        </div>
        <form onSubmit={handleSubmit}>
          {mode === "signup" && (
            <label>
              Full name
              <input
                name="fullName"
                required
                type="text"
                placeholder="Your name"
              />
            </label>
          )}
          <label>
            Email address
            <input
              name="email"
              required
              type="email"
              placeholder="you@example.com"
            />
          </label>
          <label>
            Password
            <input
              name="password"
              required
              minLength={8}
              type="password"
              placeholder="At least 8 characters"
            />
          </label>
          {mode === "signup" && (
            <label>
              Account type
              <select name="access" defaultValue="student">
                <option value="student">Student</option>
                <option value="mentor">Mentor</option>
              </select>
            </label>
          )}
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          <button className="button full" type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? "Please wait..."
              : mode === "login"
                ? "Log in"
                : "Create account"}{" "}
            <span aria-hidden="true">→</span>
          </button>
        </form>
        <p className="auth-switch">
          {mode === "login"
            ? "New to MentorConnect?"
            : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => {
              setError("");
              onModeChange(mode === "login" ? "signup" : "login");
            }}
          >
            {mode === "login" ? "Create an account" : "Log in"}
          </button>
        </p>
      </section>
    </div>
  );
};
