import { useState } from "react";
import { DashboardSidebar } from "../mentor-dashboard/components/DashboardSidebar";
import { DashboardTopbar } from "../mentor-dashboard/components/DashboardTopbar";
import { MentorChatPage } from "../mentor-dashboard/pages/MentorChatPage";
import { MentorSessionsPage } from "../mentor-dashboard/pages/MentorSessionsPage";
import { ProfilePage } from "../mentor-dashboard/pages/ProfilePage";
import { StudentOverviewPage } from "./pages/StudentOverviewPage";
import { StudentPaymentsPage } from "./pages/StudentPaymentsPage";
import "../mentor-dashboard/MentorDashboard.css";

type StudentDashboardProps = {
  isDark: boolean;
  onThemeToggle: () => void;
  onHomeClick: () => void;
  userName: string;
  onLogout: () => Promise<void>;
};

const studentNavItems = [
  "Overview",
  "Messages",
  "Sessions",
  "Payments",
  "Profile",
  "Community",
  "Settings",
] as const;

export const StudentDashboard = ({
  isDark,
  onThemeToggle,
  onHomeClick,
  userName,
  onLogout,
}: StudentDashboardProps) => {
  const [activeItem, setActiveItem] =
    useState<(typeof studentNavItems)[number]>("Overview");

  return (
    <div className="mentor-dashboard">
      <DashboardSidebar
        activeItem={activeItem}
        onNavigate={(item) =>
          setActiveItem(item as (typeof studentNavItems)[number])
        }
        onHomeClick={onHomeClick}
        navItems={[...studentNavItems]}
        dashboardType="STUDENT"
      />
      <section className="dashboard-main">
        <DashboardTopbar
          activeItem={activeItem}
          isDark={isDark}
          onThemeToggle={onThemeToggle}
          onHomeClick={onHomeClick}
          userName={userName}
          workspaceLabel="Student workspace"
          onLogout={onLogout}
          onMessagesClick={() => setActiveItem("Messages")}
        />

        {activeItem === "Overview" && (
          <StudentOverviewPage
            userName={userName}
            onOpenSessions={() => setActiveItem("Sessions")}
            onOpenProfile={() => setActiveItem("Profile")}
          />
        )}
        {activeItem === "Messages" && <MentorChatPage />}
        {activeItem === "Sessions" && <MentorSessionsPage />}
        {activeItem === "Payments" && <StudentPaymentsPage />}
        {activeItem === "Profile" && <ProfilePage />}
      </section>
    </div>
  );
};
