const overviewMetrics = [
  {
    label: "Total mentors",
    value: "287",
    change: "+5 this week",
    tone: "mint",
    icon: "♧",
  },
  {
    label: "Sessions today",
    value: "156",
    change: "+12% vs yesterday",
    tone: "sky",
    icon: "◌",
  },
  {
    label: "Live right now",
    value: "22",
    change: "14% of active sessions",
    tone: "lime",
    icon: "●",
  },
  {
    label: "Candidates",
    value: "1,248",
    change: "+8.4% this month",
    tone: "peach",
    icon: "♙",
  },
];

export const AdminOverviewPage = () => (
  <div className="admin-overview">
    <div className="admin-overview-heading">
      <div>
        <span className="eyebrow">Platform pulse · September 07, 2026</span>
        <h2>
          Overview <em>at a glance.</em>
        </h2>
        <p>Everything important happening across mentorconnect today.</p>
      </div>
      <button className="admin-date-button" type="button">
        This week <span aria-hidden="true">⌄</span>
      </button>
    </div>

    <section className="admin-metric-grid" aria-label="Platform metrics">
      {overviewMetrics.map((metric) => (
        <div className="admin-metric-card" key={metric.label}>
          <span className={`admin-metric-icon ${metric.tone}`}>
            {metric.icon}
          </span>
          <div>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <small>{metric.change}</small>
          </div>
        </div>
      ))}
    </section>

    <div className="admin-overview-grid">
      <section className="dashboard-panel admin-chart-panel">
        <div className="panel-heading">
          <div>
            <h2>Session activity</h2>
            <p>Completed and live sessions across the week</p>
          </div>
          <span className="admin-chart-legend">
            <i /> Sessions
          </span>
        </div>
        <div className="admin-chart">
          <div className="admin-chart-scale">
            <span>200</span>
            <span>150</span>
            <span>100</span>
            <span>50</span>
            <span>0</span>
          </div>
          <div className="admin-chart-bars">
            {[112, 142, 126, 171, 150, 187, 156].map((height, index) => (
              <div className="admin-chart-column" key={index}>
                <div
                  className="admin-chart-bar"
                  style={{ height: `${height / 2}px` }}
                >
                  <i style={{ height: `${Math.max(10, height / 9)}px` }} />
                </div>
                <small>
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][index]}
                </small>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="dashboard-panel admin-health-panel">
        <div className="panel-heading">
          <h2>Platform health</h2>
          <span className="health-status">
            <i /> Healthy
          </span>
        </div>
        <div className="health-score">
          <strong>92</strong>
          <span>
            /100
            <br />
            overall score
          </span>
        </div>
        <div className="health-progress">
          <span style={{ width: "92%" }} />
        </div>
        <div className="health-list">
          <div>
            <span>Mentor response rate</span>
            <strong>94%</strong>
          </div>
          <div>
            <span>Session completion</span>
            <strong>89%</strong>
          </div>
          <div>
            <span>Support queue</span>
            <strong>3 open</strong>
          </div>
        </div>
      </section>

      <section className="dashboard-panel admin-alert-panel">
        <div className="panel-heading">
          <h2>Needs attention</h2>
          <span className="alert-count">3</span>
        </div>
        <div className="admin-alert">
          <span className="alert-icon peach">!</span>
          <div>
            <strong>3 mentor profiles pending review</strong>
            <small>Last submitted 24 minutes ago</small>
          </div>
          <button type="button" aria-label="Review mentor profiles">
            ↗
          </button>
        </div>
        <div className="admin-alert">
          <span className="alert-icon lavender">$</span>
          <div>
            <strong>2 payment disputes need a response</strong>
            <small>Response due within 18 hours</small>
          </div>
          <button type="button" aria-label="Review payment disputes">
            ↗
          </button>
        </div>
        <div className="admin-alert">
          <span className="alert-icon sky">●</span>
          <div>
            <strong>Live session capacity is at 78%</strong>
            <small>Peak window begins in 40 minutes</small>
          </div>
          <button type="button" aria-label="View live capacity">
            ↗
          </button>
        </div>
      </section>

      <section className="dashboard-panel admin-activity-panel">
        <div className="panel-heading">
          <h2>Recent activity</h2>
          <button type="button">View all</button>
        </div>
        <div className="admin-activity-list">
          <div>
            <span className="activity-avatar lime">M</span>
            <p>
              <strong>Maya Chen</strong> completed a mentor verification
              <small>8 minutes ago</small>
            </p>
            <b>✓</b>
          </div>
          <div>
            <span className="activity-avatar sky">P</span>
            <p>
              <strong>Priya Shah</strong> booked a Product Design session
              <small>21 minutes ago</small>
            </p>
            <b>+1</b>
          </div>
          <div>
            <span className="activity-avatar peach">$</span>
            <p>
              <strong>Payment received</strong> from a new candidate
              subscription<small>43 minutes ago</small>
            </p>
            <b>$45</b>
          </div>
          <div>
            <span className="activity-avatar lavender">A</span>
            <p>
              <strong>Amara Okafor</strong> left a 5-star mentor review
              <small>1 hour ago</small>
            </p>
            <b>★ 5</b>
          </div>
        </div>
      </section>
    </div>
  </div>
);
