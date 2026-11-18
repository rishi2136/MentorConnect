import { useState } from "react";
import type { AuthMode, Page } from "../App";
import { ThemeToggle } from "./ThemeToggle";
import { DashboardDropdown } from "./DashboardDropdown";
import type { AuthenticatedUser } from "./AuthModal";

type HeaderProps = {
  page: Page;
  isDark: boolean;
  user: AuthenticatedUser | null;
  onNavigate: (page: Page) => void;
  onThemeToggle: () => void;
  onAuthOpen: (mode: AuthMode) => void;
  onLogout: () => Promise<void>;
};

export const Header = ({
  page,
  isDark,
  user,
  onNavigate,
  onThemeToggle,
  onAuthOpen,
  onLogout,
}: HeaderProps) => {
  const [logoutError, setLogoutError] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  return (
    <header className="header-wrapper">
      <button
        className="header-logo"
        type="button"
        onClick={() => onNavigate("home")}
        aria-label="MentorConnect home"
      >
        <span className="brand-mark">M</span>
        <span>
          mentor<span className="text-[var(--green)]">connect</span>
        </span>
      </button>

      <nav className="header-nav" aria-label="Main navigation">
        <button
          className={`header-nav-item ${page === "home" ? "active" : ""}`}
          type="button"
          onClick={() => onNavigate("home")}
        >
          Home
        </button>
        <button
          className={`header-nav-item ${page === "mentors" ? "active" : ""}`}
          type="button"
          onClick={() => onNavigate("mentors")}
        >
          Find a mentor
        </button>
        {user && (
          <button
            className={`header-nav-item ${page === "chat" ? "active" : ""}`}
            type="button"
            onClick={() => onNavigate("chat")}
          >
            Messages
          </button>
        )}
        {user && (
          <DashboardDropdown
            currentPage={page}
            onNavigate={onNavigate}
            user={user}
          />
        )}
      </nav>

      <div className="header-actions">
        <ThemeToggle isDark={isDark} onToggle={onThemeToggle} />
        {user ? (
          <>
            <span className="header-user-name">{user.fullName}</span>
            <button
              className="header-button"
              type="button"
              disabled={isLoggingOut}
              onClick={async () => {
                setLogoutError("");
                setIsLoggingOut(true);
                try {
                  await onLogout();
                } catch (error) {
                  setLogoutError(
                    error instanceof Error
                      ? error.message
                      : "Could not log out."
                  );
                } finally {
                  setIsLoggingOut(false);
                }
              }}
            >
              {isLoggingOut ? "Logging out..." : "Log out"}
            </button>
          </>
        ) : (
          <>
          <button
            className="header-button"
            type="button"
            onClick={() => onAuthOpen("login")}
          >
            Log in
          </button>
          <button
            className="header-button primary"
            type="button"
            onClick={() => onAuthOpen("signup")}
          >
            Get started
          </button>
          </>
        )}
        {logoutError && (
          <span className="auth-error" role="alert">
            {logoutError}
          </span>
        )}
      </div>
    </header>
  );
};
