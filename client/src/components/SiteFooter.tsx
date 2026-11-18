import "./SiteFooter.css";

type SiteFooterProps = {
  onMentorsClick: () => void;
  onHomeClick: () => void;
};

export const SiteFooter = ({
  onMentorsClick,
  onHomeClick,
}: SiteFooterProps) => (
  <footer className="site-footer">
    <div>
      <button
        className="brand footer-brand"
        type="button"
        onClick={onHomeClick}
      >
        <span className="brand-mark">M</span>
        <span>
          mentor<span>connect</span>
        </span>
      </button>
      <p>Good guidance changes everything.</p>
      <label className="footer-input">
        <input
          type="email"
          placeholder="Email address"
          aria-label="Email address"
        />
        <button type="button" aria-label="Subscribe">
          →
        </button>
      </label>
    </div>
    <div className="footer-links">
      <div>
        <strong>Explore</strong>
        <button type="button" onClick={onMentorsClick}>
          Mentors
        </button>
        <button type="button" onClick={onMentorsClick}>
          Courses
        </button>
      </div>
      <div>
        <strong>Company</strong>
        <button type="button">About us</button>
        <button type="button">Contact us</button>
      </div>
      <div>
        <strong>Follow along</strong>
        <span>Instagram</span>
        <span>LinkedIn</span>
      </div>
    </div>
    <small>© MentorConnect. All rights reserved.</small>
  </footer>
);
