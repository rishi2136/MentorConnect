import type { Course } from "../data/mentors";

type CourseCardProps = { course: Course; onEnroll: () => void };

export const CourseCard = ({ course, onEnroll }: CourseCardProps) => (
  <article className="course-card">
    <img src={course.image} alt="" />
    <div className="course-card-body">
      <span className="course-category">{course.category} · ★ 4.5</span>
      <h3>{course.title}</h3>
      <p>
        ◷ {course.lessons} lessons <span>◌ {course.hours} hrs</span>
      </p>
      <div>
        <strong>${course.price}</strong>
        <button className="text-button" type="button" onClick={onEnroll}>
          Enroll now →
        </button>
      </div>
    </div>
  </article>
);
