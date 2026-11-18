import { useNavigate } from "react-router";
import {
  activities,
  activityDays,
  assignments,
  schedule,
  type Assignment,
  type ScheduleItem,
} from "../data";

type MiniCourseProps = {
  title: string;
  meta: string;
  type: string;
  rating: string;
  icon: string;
};

export const NewCoursesPanel = () => (
  <section className="dashboard-panel new-courses">
    <PanelHeading title="New courses" action="View all →" />
    <div className="mini-course-grid">
      <MiniCourse
        title="Content Writing"
        meta="12 Lessons"
        type="Data Research"
        rating="4.8"
        icon="◉"
      />
      <MiniCourse
        title="Usability Testing"
        meta="15 Lessons"
        type="UI/UX Design"
        rating="5.0"
        icon="▣"
      />
      <MiniCourse
        title="Photography"
        meta="8 Lessons"
        type="Art and Design"
        rating="4.6"
        icon="◌"
      />
    </div>
  </section>
);

export const PremiumPanel = () => {
  const navigate = useNavigate();

  return (
    <section className="dashboard-panel premium-panel">
      <button
        type="button"
        className="dashboard-logo"
        onClick={() => navigate("/")}
      >
        <span className="dashboard-logo-mark">M</span>mentorconnect
      </button>
      <h2>Go premium</h2>
      <p>
        Unlock advanced tools for your
        <br />
        mentoring practice.
      </p>
      <button type="button">Get access ↗</button>
      <span className="premium-shape" aria-hidden="true">
        ✦
      </span>
    </section>
  );
};

export const ActivityPanel = () => (
  <section className="dashboard-panel activity-panel">
    <div className="panel-heading">
      <div>
        <h2>Hours activity</h2>
        <p>
          ↗ <strong>+3%</strong> Increase than last week
        </p>
      </div>
      <select aria-label="Activity time range">
        <option>Weekly</option>
        <option>Monthly</option>
      </select>
    </div>
    <div className="activity-chart">
      {activities.map((height, index) => (
        <div className="chart-column" key={activityDays[index]}>
          <span
            className={index === 3 ? "chart-bar highlighted" : "chart-bar"}
            style={{ height: `${height * 7}px` }}
          />
          <small>{activityDays[index]}</small>
        </div>
      ))}
    </div>
  </section>
);

export const SchedulePanel = () => (
  <section className="dashboard-panel schedule-panel">
    <PanelHeading title="Daily schedule" action="View all →" />
    <div className="schedule-list">
      {schedule.map((item) => (
        <ScheduleRow item={item} key={item.title} />
      ))}
    </div>
  </section>
);

export const CalendarPanel = () => (
  <section className="dashboard-panel calendar-panel">
    <div className="calendar-header">
      <button type="button" aria-label="Previous month">
        ‹
      </button>
      <strong>August, 2026</strong>
      <button type="button" aria-label="Next month">
        ›
      </button>
    </div>
    <div className="calendar-week">
      {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
        <span key={`${day}-${index}`}>{day}</span>
      ))}
    </div>
    <div className="calendar-days">
      {Array.from({ length: 31 }, (_, index) => (
        <span className={index === 16 ? "today" : ""} key={index}>
          {index + 1}
        </span>
      ))}
    </div>
  </section>
);

export const ClassesPanel = () => (
  <section className="dashboard-panel classes-panel">
    <PanelHeading
      title="Classes you lead"
      action="+"
      actionClass="plus-button"
    />
    <ClassProgress
      title="Product Design Course"
      detail="Today · 09:00 AM"
      tone="peach"
      progress="45%"
      icon="◈"
    />
    <ClassProgress
      title="Development Basics"
      detail="Tomorrow · 10:30 AM"
      tone="lavender"
      progress="75%"
      icon="◌"
    />
  </section>
);

export const AssignmentsPanel = () => (
  <section className="dashboard-panel assignments-panel">
    <PanelHeading title="Assignments" action="+" actionClass="plus-button" />
    {assignments.map((assignment) => (
      <AssignmentRow assignment={assignment} key={assignment.title} />
    ))}
  </section>
);

const PanelHeading = ({
  title,
  action,
  actionClass = "",
}: {
  title: string;
  action: string;
  actionClass?: string;
}) => (
  <div className="panel-heading">
    <h2>{title}</h2>
    <button className={actionClass} type="button">
      {action}
    </button>
  </div>
);
const MiniCourse = ({ title, meta, type, rating, icon }: MiniCourseProps) => (
  <article className="mini-course">
    <span className="course-icon">{icon}</span>
    <strong>{title}</strong>
    <small>{meta}</small>
    <div>
      <span>Rate</span>
      <span>Type</span>
    </div>
    <div>
      <b>★ {rating}</b>
      <b>{type}</b>
    </div>
  </article>
);
const ScheduleRow = ({ item }: { item: ScheduleItem }) => (
  <div className="schedule-row">
    <span className={`schedule-icon ${item.tone}`}>{item.icon}</span>
    <div>
      <strong>{item.title}</strong>
      <small>{item.type}</small>
    </div>
    <button type="button" aria-label={`Open ${item.title}`}>
      ›
    </button>
  </div>
);
const ClassProgress = ({
  title,
  detail,
  tone,
  progress,
  icon,
}: {
  title: string;
  detail: string;
  tone: string;
  progress: string;
  icon: string;
}) => (
  <div className="class-progress">
    <div className={`class-icon ${tone}`}>{icon}</div>
    <div>
      <strong>{title}</strong>
      <small>{detail}</small>
    </div>
    <div
      className={progress === "75%" ? "progress-ring high" : "progress-ring"}
    >
      <span>{progress}</span>
    </div>
  </div>
);
const AssignmentRow = ({ assignment }: { assignment: Assignment }) => (
  <div className="assignment-row">
    <span className={`assignment-icon ${assignment.tone}`}>✦</span>
    <div>
      <strong>{assignment.title}</strong>
      <small>{assignment.detail}</small>
    </div>
    <span className={`assignment-status ${assignment.tone}`}>
      {assignment.status}
    </span>
  </div>
);
