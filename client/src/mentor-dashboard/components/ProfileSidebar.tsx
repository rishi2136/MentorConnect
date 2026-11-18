type ProfileSidebarProps = {
  name: string;
  role: string;
  stats: { label: string; value: string }[];
  contact: { icon: string; value: string }[];
};

export const ProfileSidebar = ({
  name,
  role,
  stats,
  contact,
}: ProfileSidebarProps) => (
  <aside className="profile-sidebar-card">
    <div className="profile-avatar-wrap">
      <div className="profile-avatar">P</div>
    </div>

    <h3>{name}</h3>
    <p className="profile-role">{role}</p>

    <div className="profile-stats-grid">
      {stats.map((stat) => (
        <div key={stat.label} className="profile-stat-item">
          <strong>{stat.value}</strong>
          <span>{stat.label}</span>
        </div>
      ))}
    </div>

    <div className="profile-contact-list">
      {contact.map((row) => (
        <div key={row.value} className="profile-contact-row">
          <span aria-hidden="true">{row.icon}</span>
          <span>{row.value}</span>
        </div>
      ))}
    </div>
  </aside>
);
