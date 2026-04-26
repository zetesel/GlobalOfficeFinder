import { Link } from "react-router-dom";

export default function Header() {
  return (
    <header className="site-header">
      <div className="container">
        <Link to="/" className="site-logo">
          🌐 GlobalOfficeFinder
        </Link>
        <nav className="site-nav" aria-label="Main navigation">
          <Link to="/">Search</Link>
          <Link to="/recent-changes">Recent Changes</Link>
          <Link to="/review-queue">Review Queue</Link>
        </nav>
      </div>
    </header>
  );
}
