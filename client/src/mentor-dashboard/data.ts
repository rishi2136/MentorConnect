export type NavItem =
  | "Dashboard"
  | "My classes"
  | "Chat"
  | "Sessions"
  | "Transactions"
  | "Services"
  | "Profile"
  | "Calendar"
  | "Community"
  | "Settings";

export type ScheduleItem = { title: string; type: string; tone: string; icon: string };
export type Assignment = { title: string; detail: string; status: string; tone: string };

export const activities = [7, 11, 8, 14, 10, 6, 11];
export const activityDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
export const dashboardNavItems: NavItem[] = ["Dashboard", "My classes", "Chat", "Sessions", "Transactions", "Services", "Profile", "Community", "Settings"];
export const schedule: ScheduleItem[] = [
  { title: "Design System", type: "Lecture - Class", tone: "peach", icon: "▦" },
  { title: "Typography", type: "Group - Test", tone: "lavender", icon: "♧" },
  { title: "Color Style", type: "Group - Test", tone: "lime", icon: "✣" },
  { title: "Visual Design", type: "Lecture - Test", tone: "peach", icon: "◌" },
];
export const assignments: Assignment[] = [
  { title: "Methods of data", detail: "02 July, 10:30 AM", status: "In progress", tone: "lavender" },
  { title: "Market Research", detail: "14 June, 12:45 AM", status: "Completed", tone: "lime" },
  { title: "Data Collection", detail: "12 May, 11:00 AM", status: "Upcoming", tone: "peach" },
];
