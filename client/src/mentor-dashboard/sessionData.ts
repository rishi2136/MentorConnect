export type SessionStatus = "Past" | "Upcoming" | "Live";
export type Session = { id: number; student: string; initials: string; tone: string; topic: string; date: string; time: string; duration: string; status: SessionStatus; mode: string };

export const sessions: Session[] = [
  { id: 1, student: "Jordan Miller", initials: "JM", tone: "sky", topic: "Portfolio review", date: "Today", time: "10:00 AM", duration: "45 min", status: "Live", mode: "Video call" },
  { id: 2, student: "Avery Johnson", initials: "AJ", tone: "peach", topic: "Product design foundations", date: "Today", time: "02:30 PM", duration: "60 min", status: "Upcoming", mode: "Video call" },
  { id: 3, student: "Sam Williams", initials: "SW", tone: "lavender", topic: "Career direction", date: "Tomorrow", time: "11:00 AM", duration: "45 min", status: "Upcoming", mode: "Video call" },
  { id: 4, student: "Morgan Lee", initials: "ML", tone: "lime", topic: "Design critique", date: "Aug 30", time: "09:30 AM", duration: "30 min", status: "Upcoming", mode: "Video call" },
  { id: 5, student: "Casey Brown", initials: "CB", tone: "coral", topic: "UX research review", date: "Aug 18", time: "03:00 PM", duration: "60 min", status: "Past", mode: "Video call" },
  { id: 6, student: "Riley Davis", initials: "RD", tone: "mint", topic: "First portfolio review", date: "Aug 12", time: "01:00 PM", duration: "45 min", status: "Past", mode: "Video call" },
];
