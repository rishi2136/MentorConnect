import { useState } from "react";
import type { Page } from "../App";
import type { AuthenticatedUser } from "./AuthModal";

type DashboardDropdownProps = {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  user: AuthenticatedUser;
};

export const DashboardDropdown = ({
  currentPage,
  onNavigate,
  user,
}: DashboardDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const dashboardByRole: Record<
    AuthenticatedUser["access"][number],
    { label: string; page: Page }
  > = {
    mentor: { label: "Mentor Dashboard", page: "mentor-dashboard" },
    student: { label: "Student Dashboard", page: "student-dashboard" },
    admin: { label: "Admin Dashboard", page: "admin-dashboard" },
  };
  const dashboards = user.access.map((role) => dashboardByRole[role]);
  const currentDashboard = dashboards.find(
    (dashboard) => dashboard.page === currentPage
  );

  if (dashboards.length === 1) {
    return (
      <button
        className={`header-nav-item ${currentDashboard ? "active" : ""}`}
        type="button"
        onClick={() => onNavigate(dashboards[0]!.page)}
      >
        Dashboard
      </button>
    );
  }

  const isActive = Boolean(currentDashboard);

  const handleSelect = (page: Page) => {
    onNavigate(page);
    setIsOpen(false);
  };

  return (
    <div className="dashboard-dropdown-wrapper">
      <button
        className={`header-nav-item ${isActive ? "active" : ""}`}
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
      >
        Dashboard
        <span
          aria-hidden="true"
          className={`inline-block transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        >
          ▼
        </span>
      </button>

      {isOpen && (
        <div className="dashboard-dropdown-menu">
          {dashboards.map((dashboard) => (
            <button
              key={dashboard.page}
              className={`dashboard-dropdown-item ${
                currentPage === dashboard.page ? "active" : ""
              }`}
              type="button"
              onClick={() => handleSelect(dashboard.page)}
            >
              {dashboard.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
