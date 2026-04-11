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
        </nav>
      </div>
    </header>
  );
}
