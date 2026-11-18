type StudentMiniCourseProps = {
  title: string;
  meta: string;
  lesson: string;
  progress: string;
  timeLeft: string;
  icon: string;
};

export const StudentMiniCourse = ({
  title,
  meta,
  lesson,
  progress,
  timeLeft,
  icon,
}: StudentMiniCourseProps) => (
  <article className="mini-course">
    <div className="course-icon">{icon}</div>
    <strong>{title}</strong>
    <small>{meta}</small>
    <div>
      <span>{lesson}</span>
      <b>{progress}</b>
    </div>
    <div>
      <b>{timeLeft}</b>
      <span>left to finish</span>
    </div>
  </article>
);

type StudentSessionRowProps = {
  title: string;
  time: string;
  tone: "peach" | "lavender" | "lime";
  icon: string;
};

export const StudentSessionRow = ({
  title,
  time,
  tone,
  icon,
}: StudentSessionRowProps) => (
  <div className="schedule-row">
    <span className={`schedule-icon ${tone}`}>{icon}</span>
    <div>
      <strong>{title}</strong>
      <small>{time}</small>
    </div>
    <button type="button" aria-label={`Open ${title}`}>
      ›
    </button>
  </div>
);

type StudentClassCardProps = {
  title: string;
  detail: string;
  tone: "lime" | "lavender";
  progress: string;
  icon: string;
};

export const StudentClassCard = ({
  title,
  detail,
  tone,
  progress,
  icon,
}: StudentClassCardProps) => (
  <div className="class-progress">
    <div className={`class-icon ${tone}`}>{icon}</div>
    <div>
      <strong>{title}</strong>
      <small>{detail}</small>
    </div>
    <div
      className={progress === "72%" ? "progress-ring high" : "progress-ring"}
    >
      <span>{progress}</span>
    </div>
  </div>
);

type StudentAssignmentRowProps = {
  title: string;
  detail: string;
  tone: "lavender" | "lime" | "peach";
  status: string;
  icon: string;
};

export const StudentAssignmentRow = ({
  title,
  detail,
  tone,
  status,
  icon,
}: StudentAssignmentRowProps) => (
  <div className="assignment-row">
    <span className={`assignment-icon ${tone}`}>{icon}</span>
    <div>
      <strong>{title}</strong>
      <small>{detail}</small>
    </div>
    <span className={`assignment-status ${tone}`}>{status}</span>
  </div>
);
