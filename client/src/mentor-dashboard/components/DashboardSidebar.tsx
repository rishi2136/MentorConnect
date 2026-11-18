import { dashboardNavItems } from "../data";

type DashboardSidebarProps = {
  activeItem: string;
  onNavigate: (item: string) => void;
  onHomeClick: () => void;
  navItems?: string[];
  dashboardType?: "MENTOR" | "STUDENT" | "ADMIN";
};
const icons = ["⌂", "▣", "▢", "□", "♧", "⚙"];

export const DashboardSidebar = ({
  activeItem,
  onNavigate,
  onHomeClick,
  navItems = dashboardNavItems,
  dashboardType = "MENTOR",
}: DashboardSidebarProps) => (
  <aside className="dashboard-sidebar">
    <button type="button" className="dashboard-logo" onClick={onHomeClick}>
      <span className="dashboard-logo-mark">M</span>mentorconnect
    </button>
    <div className="dashboard-sidebar-label">
      {dashboardType === "MENTOR"
        ? "MENTOR DASHBOARD"
        : dashboardType === "STUDENT"
          ? "STUDENT DASHBOARD"
          : "ADMIN DASHBOARD"}
    </div>
    <nav className="dashboard-nav" aria-label="Dashboard navigation">
      {navItems.map((item, index) => (
        <button
          className={
            activeItem === item
              ? "dashboard-nav-item active"
              : "dashboard-nav-item"
          }
          type="button"
          key={item}
          onClick={() => onNavigate(item)}
        >
          <span aria-hidden="true">{icons[index % icons.length]}</span>
          {item}
        </button>
      ))}
    </nav>
    <div className="dashboard-app-promo">
      <span className="promo-arrow">↗</span>
      <strong>
        Take your
        <br />
        mentoring mobile.
      </strong>
      <button type="button">Get the app</button>
    </div>
  </aside>
);
