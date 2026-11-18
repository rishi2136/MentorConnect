import { useState } from "react";
import { useNavigate } from "react-router";
import "./MentorDashboard.css";
import { DashboardSidebar } from "./components/DashboardSidebar";
import { DashboardTopbar } from "./components/DashboardTopbar";
import type { NavItem } from "./data";
import { MentorChatPage } from "./pages/MentorChatPage";
import { MentorOverviewPage } from "./pages/MentorOverviewPage";
import { MentorServicesPage } from "./pages/MentorServicesPage";
import { MentorSessionsPage } from "./pages/MentorSessionsPage";
import { MentorTransactionsPage } from "./pages/MentorTransactionsPage";
import { ProfilePage } from "./pages/ProfilePage";

type MentorDashboardProps = {
  isDark: boolean;
  onThemeToggle: () => void;
  onHomeClick: () => void;
  userName: string;
  onLogout: () => Promise<void>;
};

export const MentorDashboard = ({
  isDark,
  onThemeToggle,
  onHomeClick,
  userName,
  onLogout,
}: MentorDashboardProps) => {
  const [activeItem, setActiveItem] = useState<NavItem>("Dashboard");
  const navigate = useNavigate();

  return (
    <div className="mentor-dashboard">
      <DashboardSidebar
        activeItem={activeItem}
        onNavigate={(item) => setActiveItem(item as NavItem)}
        onHomeClick={onHomeClick}
        dashboardType="MENTOR"
      />
      <section className="dashboard-main">
        <DashboardTopbar
          activeItem={activeItem}
          isDark={isDark}
          onThemeToggle={onThemeToggle}
          onHomeClick={() => navigate("/")}
          userName={userName}
          onLogout={onLogout}
          onMessagesClick={() => setActiveItem("Chat")}
        />
        {activeItem === "Chat" ? (
          <MentorChatPage />
        ) : activeItem === "Sessions" ? (
          <MentorSessionsPage />
        ) : activeItem === "Transactions" ? (
          <MentorTransactionsPage />
        ) : activeItem === "Services" ? (
          <MentorServicesPage />
        ) : activeItem === "Profile" ? (
          <ProfilePage />
        ) : (
          <MentorOverviewPage
            userName={userName}
            onOpenSessions={() => setActiveItem("Sessions")}
            onOpenProfile={() => setActiveItem("Profile")}
          />
        )}
      </section>
    </div>
  );
};
