export const StudentPaymentsPage = () => (
  <section className="payments-page">
    <div className="payments-header-row">
      <div>
        <span className="eyebrow">Payment History</span>
        <h2>Your transactions</h2>
      </div>
    </div>

    <div className="payments-metrics">
      <div className="metric-card">
        <span className="metric-label">Total spent</span>
        <strong>$2,450.00</strong>
        <small>Across all mentoring sessions</small>
      </div>
      <div className="metric-card">
        <span className="metric-label">This month</span>
        <strong>$380.50</strong>
        <small>5 active sessions</small>
      </div>
      <div className="metric-card">
        <span className="metric-label">Payment method</span>
        <strong>Visa ••• 4242</strong>
        <small>Default payment card</small>
      </div>
    </div>

    <div className="payments-table-panel">
      <div className="table-header">
        <h3>Recent transactions</h3>
        <button type="button" className="primary-button">
          Download invoice
        </button>
      </div>

      <table className="payments-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Mentor</th>
            <th>Session type</th>
            <th>Duration</th>
            <th>Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>28 Aug, 2026</td>
            <td>Sarah Chen</td>
            <td>UX Design Review</td>
            <td>60 min</td>
            <td>$18.00</td>
            <td>
              <span className="status-badge paid">Paid</span>
            </td>
          </tr>
          <tr>
            <td>26 Aug, 2026</td>
            <td>James Wilson</td>
            <td>Frontend Consultation</td>
            <td>45 min</td>
            <td>$13.50</td>
            <td>
              <span className="status-badge paid">Paid</span>
            </td>
          </tr>
          <tr>
            <td>24 Aug, 2026</td>
            <td>Emma Martinez</td>
            <td>Portfolio Feedback</td>
            <td>30 min</td>
            <td>$7.50</td>
            <td>
              <span className="status-badge paid">Paid</span>
            </td>
          </tr>
          <tr>
            <td>22 Aug, 2026</td>
            <td>Sarah Chen</td>
            <td>Brand Strategy</td>
            <td>90 min</td>
            <td>$27.00</td>
            <td>
              <span className="status-badge pending">Pending</span>
            </td>
          </tr>
          <tr>
            <td>20 Aug, 2026</td>
            <td>Michael Johnson</td>
            <td>Career Coaching</td>
            <td>60 min</td>
            <td>$18.00</td>
            <td>
              <span className="status-badge paid">Paid</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
);
