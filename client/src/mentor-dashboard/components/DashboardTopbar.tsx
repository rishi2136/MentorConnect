import { useState } from "react";
import { ThemeToggle } from "../../components/ThemeToggle";

type DashboardTopbarProps = {
  isDark: boolean;
  onThemeToggle: () => void;
  activeItem: string;
  onHomeClick: () => void;
  userName?: string;
  workspaceLabel?: string;
  onLogout?: () => Promise<void>;
  onMessagesClick?: () => void;
};

export const DashboardTopbar = ({
  isDark,
  onThemeToggle,
  activeItem,
  onHomeClick,
  userName = "Taylor",
  workspaceLabel,
  onLogout,
  onMessagesClick,
}: DashboardTopbarProps) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const resolvedWorkspaceLabel =
    workspaceLabel ??
    (activeItem === "Dashboard" || activeItem === "Overview"
      ? "Mentor workspace"
      : "Your workspace");

  return (
    <header className="dashboard-topbar">
      <div className="dashboard-greeting">
        <span className="eyebrow">{resolvedWorkspaceLabel}</span>
        <h1>
          Welcome back, {userName} <span aria-hidden="true">👋</span>
        </h1>
      </div>
      <div className="dashboard-tools">
        <label className="dashboard-search">
          <span aria-hidden="true">⌕</span>
          <input placeholder="Search dashboard" aria-label="Search dashboard" />
        </label>
        <button className="button outline" type="button" onClick={onHomeClick}>
          Home
        </button>
        {onMessagesClick && (
          <button
            className="button outline"
            type="button"
            onClick={onMessagesClick}
          >
            Messages
          </button>
        )}
        {onLogout && (
          <button
            className="button outline"
            type="button"
            disabled={isLoggingOut}
            onClick={async () => {
              setLogoutError("");
              setIsLoggingOut(true);
              try {
                await onLogout();
              } catch (error) {
                setLogoutError(
                  error instanceof Error ? error.message : "Could not log out."
                );
              } finally {
                setIsLoggingOut(false);
              }
            }}
          >
            {isLoggingOut ? "Logging out..." : "Log out"}
          </button>
        )}
        <ThemeToggle isDark={isDark} onToggle={onThemeToggle} />
        <button
          className="notification-button"
          type="button"
          aria-label="View notifications"
          onClick={() => setShowNotifications((current) => !current)}
        >
          ♧<i />
        </button>
        <div className="mentor-avatar">{userName.charAt(0).toUpperCase()}</div>
        {showNotifications && (
          <div className="notification-popover">
            <strong>Notifications</strong>
            <p>You have 2 new messages.</p>
            <p>Your next class starts tomorrow.</p>
          </div>
        )}
      </div>
      {logoutError && (
        <p className="notification-popover" role="alert">
          {logoutError}
        </p>
      )}
    </header>
  );
};
