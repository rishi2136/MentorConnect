import { useMemo, useState } from "react";
import "../transactions.css";

type TransactionStatus = "Completed" | "To process" | "Total Services Offers";
type PaymentStatus = "Paid" | "Pending" | "Refunded";

type Transaction = {
  id: number;
  date: string;
  customerId: string;
  customerName: string;
  paymentStatus: PaymentStatus;
  sessionStatus: TransactionStatus;
  duration: string;
  total: number;
};

const data: Transaction[] = [
  {
    id: 1,
    date: "27/06/24",
    customerId: "#6391",
    customerName: "Flexy Chair d...",
    paymentStatus: "Paid",
    sessionStatus: "Completed",
    duration: "1h 20m",
    total: 183,
  },
  {
    id: 2,
    date: "27/06/24",
    customerId: "#6390",
    customerName: "Cascade Boo...",
    paymentStatus: "Paid",
    sessionStatus: "Completed",
    duration: "1h 15m",
    total: 499,
  },
  {
    id: 3,
    date: "27/06/24",
    customerId: "#6389",
    customerName: "Nova Bar Sto...",
    paymentStatus: "Paid",
    sessionStatus: "Completed",
    duration: "1h 00m",
    total: 234,
  },
  {
    id: 4,
    date: "24/06/24",
    customerId: "#6388",
    customerName: "Haven Armch...",
    paymentStatus: "Paid",
    sessionStatus: "Completed",
    duration: "1h 05m",
    total: 112,
  },
  {
    id: 5,
    date: "24/06/24",
    customerId: "#6387",
    customerName: "Nova Coffee...",
    paymentStatus: "Paid",
    sessionStatus: "Completed",
    duration: "52m",
    total: 132,
  },
  {
    id: 6,
    date: "23/06/24",
    customerId: "#6386",
    customerName: "Zenith Conso...",
    paymentStatus: "Paid",
    sessionStatus: "Total Services Offers",
    duration: "2h 10m",
    total: 231,
  },
];

const filters = [
  "All",
  "Completed",
  "To process",
  "Total Services Offers",
] as const;

type Filter = (typeof filters)[number];

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export const MentorTransactionsPage = () => {
  const [selectedFilter, setSelectedFilter] = useState<Filter>("All");
  const [query, setQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const filteredTransactions = useMemo(() => {
    return data.filter((item) => {
      const matchesFilter =
        selectedFilter === "All" || item.sessionStatus === selectedFilter;
      const haystack =
        `${item.customerName} ${item.customerId} ${item.date}`.toLowerCase();
      const matchesQuery = haystack.includes(query.toLowerCase());
      return matchesFilter && matchesQuery;
    });
  }, [query, selectedFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredTransactions.length / pageSize),
  );

  const safeCurrentPage = Math.min(currentPage, totalPages);

  const visibleTransactions = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return filteredTransactions.slice(startIndex, startIndex + pageSize);
  }, [filteredTransactions, safeCurrentPage]);

  const pageButtons = Array.from(
    { length: totalPages },
    (_, index) => index + 1,
  );

  const handleFilterChange = (nextFilter: Filter) => {
    setSelectedFilter(nextFilter);
    setCurrentPage(1);
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setCurrentPage(1);
  };

  return (
    <section className="transactions-page">
      <div className="transactions-header">
        <div className="transactions-header-left">
          <div className="transactions-title">Transactions</div>
        </div>
        <div className="transactions-tools">
          <label className="transactions-search">
            <span aria-hidden="true">⌕</span>
            <input
              value={query}
              onChange={(event) => handleQueryChange(event.target.value)}
              placeholder="Search"
              aria-label="Search transactions"
            />
          </label>
          <button type="button" className="transactions-filter-button">
            <span aria-hidden="true">◌</span>
            June
          </button>
          <button type="button" className="transactions-export-button">
            Export
          </button>
          <button type="button" className="transactions-connect-button">
            + Connect wallet
          </button>
          <button
            type="button"
            className="transactions-menu-button"
            aria-label="More actions"
          >
            ☰
          </button>
        </div>
      </div>

      <div className="transactions-metrics">
        <div className="transactions-metric-card">
          <div className="transactions-metric-label">Total Revenue</div>
          <div className="transactions-metric-row">
            <span className="transactions-metric-value">$712,241</span>
            <span className="transactions-metric-change">↓ 4.7%</span>
          </div>
        </div>
        <div className="transactions-metric-card">
          <div className="transactions-metric-label">Total customers</div>
          <div className="transactions-metric-row">
            <span className="transactions-metric-value">4,213</span>
            <span className="transactions-metric-change">↓ 3.2%</span>
          </div>
        </div>
        <div className="transactions-metric-card">
          <div className="transactions-metric-label">Total transactions</div>
          <div className="transactions-metric-row">
            <span className="transactions-metric-value">563</span>
            <span className="transactions-metric-change">↓ 1.3%</span>
          </div>
        </div>
        <div className="transactions-metric-card">
          <div className="transactions-metric-label">Total Services Offers</div>
          <div className="transactions-metric-row">
            <span className="transactions-metric-value">882</span>
            <span className="transactions-metric-change">↓ 1.2%</span>
          </div>
        </div>
      </div>

      <div className="transactions-filters-row">
        {filters.map((filter) => (
          <button
            key={filter}
            type="button"
            className={
              filter === selectedFilter
                ? "transactions-pill active"
                : "transactions-pill"
            }
            onClick={() => handleFilterChange(filter)}
          >
            {filter === "All" ? "All" : filter}
          </button>
        ))}
        <div className="transactions-filter-spacer" />
      </div>

      <div className="transactions-table-wrap">
        <table className="transactions-table">
          <thead>
            <tr>
              <th className="checkbox-cell">
                <input type="checkbox" aria-label="Select all rows" />
              </th>
              <th>Date</th>
              <th>Customer ID</th>
              <th>Customer Name</th>
              <th>Payment Status</th>
              <th>Session Status</th>
              <th>Time</th>
              <th>Total cost paid</th>
            </tr>
          </thead>
          <tbody>
            {visibleTransactions.map((row) => (
              <tr key={row.id}>
                <td className="checkbox-cell">
                  <input type="checkbox" aria-label={`Select row ${row.id}`} />
                </td>
                <td>{row.date}</td>
                <td>{row.customerId}</td>
                <td>{row.customerName}</td>
                <td>
                  <span className="status-pill pay-pill">
                    {row.paymentStatus}
                  </span>
                </td>
                <td>
                  <span
                    className={
                      row.sessionStatus === "Completed"
                        ? "status-pill success"
                        : row.sessionStatus === "To process"
                          ? "status-pill warning"
                          : "status-pill neutral"
                    }
                  >
                    {row.sessionStatus}
                  </span>
                </td>
                <td>{row.duration}</td>
                <td>{currency.format(row.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="transactions-footer">
        <button
          type="button"
          onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
          disabled={safeCurrentPage === 1}
        >
          ‹
        </button>
        {pageButtons.map((page) => (
          <button
            key={page}
            type="button"
            className={page === safeCurrentPage ? "page active" : "page"}
            onClick={() => setCurrentPage(page)}
          >
            {page}
          </button>
        ))}
        <button
          type="button"
          onClick={() =>
            setCurrentPage((page) => Math.min(totalPages, page + 1))
          }
          disabled={safeCurrentPage === totalPages}
        >
          ›
        </button>
      </div>
    </section>
  );
};
