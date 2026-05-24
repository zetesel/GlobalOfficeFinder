import { Link } from "react-router-dom";
import { useAwaitingApprovalCount } from "../hooks/useAwaitingApprovalCount";

export default function Header() {
  const awaitingCount = useAwaitingApprovalCount();

  const reviewQueueLabel =
    awaitingCount > 0
      ? `Review Queue, ${awaitingCount} offices awaiting approval`
      : "Review Queue";

  return (
    <header className="site-header">
      <div className="container">
        <Link to="/" className="site-logo">
          🌐 GlobalOfficeFinder
        </Link>
        <nav className="site-nav" aria-label="Main navigation">
          <Link to="/">Search</Link>
          <Link to="/recent-changes">Recent Changes</Link>
          <span className="nav-review-queue">
            <Link to="/review-queue" aria-label={reviewQueueLabel}>
              Review Queue
            </Link>
            {awaitingCount > 0 ? (
              <span className="nav-badge" aria-hidden="true">
                {awaitingCount}
              </span>
            ) : null}
          </span>
        </nav>
      </div>
    </header>
  );
}
