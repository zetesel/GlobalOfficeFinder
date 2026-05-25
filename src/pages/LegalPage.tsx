import { Link } from "react-router-dom";
import { DISCLAIMER_LONG, TRADEMARK_NOTICE } from "../content/legal";

export default function LegalPage() {
  return (
    <div className="container legal-page">
      <nav aria-label="Breadcrumb" className="breadcrumb">
        <Link to="/">Home</Link> › <span>Legal</span>
      </nav>
      <header className="page-header">
        <h1>Legal &amp; disclaimer</h1>
      </header>
      <section className="info-card">
        <h2>Disclaimer</h2>
        <p>{DISCLAIMER_LONG}</p>
      </section>
      <section className="info-card">
        <h2>Trademarks</h2>
        <p>{TRADEMARK_NOTICE}</p>
      </section>
      <section className="info-card">
        <h2>Data accuracy</h2>
        <p>
          Office locations are compiled from public sources and community contributions. We make no
          warranty as to completeness or accuracy. Always confirm details on each company&apos;s
          official website.
        </p>
      </section>
      <p className="muted">
        See also <Link to="/attributions">logo attributions</Link>.
      </p>
    </div>
  );
}
