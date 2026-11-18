type ThemeToggleProps = { isDark: boolean; onToggle: () => void };

export const ThemeToggle = ({ isDark, onToggle }: ThemeToggleProps) => (
  <>
    Theme Toggle
    <button
      className="icon-button"
      type="button"
      onClick={onToggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <span aria-hidden="true">{isDark ? "☼" : "◐"}</span>
    </button>
  </>
);
