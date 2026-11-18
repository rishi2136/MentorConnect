import { useState } from "react";
import "../mentor-dashboard/MentorDashboard.css";
import { DashboardSidebar } from "../mentor-dashboard/components/DashboardSidebar";
import { DashboardTopbar } from "../mentor-dashboard/components/DashboardTopbar";
import { AdminOverviewPage } from "./pages/AdminOverviewPage";
import { AdminCandidatesPage } from "./pages/AdminCandidatesPage";
import { AdminMentorsPage } from "./pages/AdminMentorsPage";
import { MentorChatPage } from "../mentor-dashboard/pages/MentorChatPage";
import "./AdminDashboard.css";

type AdminDashboardProps = {
  isDark: boolean;
  onThemeToggle: () => void;
  onHomeClick: () => void;
  userName: string;
  onLogout: () => Promise<void>;
};

const adminNavItems = [
  "Overview",
  "Users",
  "Mentors",
  "Chat",
  "Transactions",
  "Reports",
  "Settings",
] as const;

export const AdminDashboard = ({
  isDark,
  onThemeToggle,
  onHomeClick,
  userName,
  onLogout,
}: AdminDashboardProps) => {
  const [activeItem, setActiveItem] =
    useState<(typeof adminNavItems)[number]>("Overview");
  return (
    <div className="mentor-dashboard">
      <DashboardSidebar
        activeItem={activeItem}
        onNavigate={(item) =>
          setActiveItem(item as (typeof adminNavItems)[number])
        }
        onHomeClick={onHomeClick}
        navItems={[...adminNavItems]}
        dashboardType="ADMIN"
      />
      <section className="dashboard-main">
        <DashboardTopbar
          activeItem={activeItem}
          isDark={isDark}
          onThemeToggle={onThemeToggle}
          onHomeClick={onHomeClick}
          userName={userName}
          workspaceLabel="Admin workspace"
          onLogout={onLogout}
          onMessagesClick={() => setActiveItem("Chat")}
        />
        {activeItem === "Overview" ? (
          <AdminOverviewPage />
        ) : activeItem === "Users" ? (
          <AdminCandidatesPage />
        ) : activeItem === "Mentors" ? (
          <AdminMentorsPage />
        ) : activeItem === "Chat" ? (
          <MentorChatPage />
        ) : (
          <div className="admin-coming-soon">
            <p>{activeItem} page coming soon...</p>
          </div>
        )}
      </section>
    </div>
  );
};
