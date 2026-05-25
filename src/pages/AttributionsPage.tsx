import { Link } from "react-router-dom";
import { getAllApprovedLogos, requiresAttribution } from "../utils/companyLogos";
import companies from "../../data/companies.json";
import type { Company } from "../types";

const companyNameById = Object.fromEntries(
  (companies as Company[]).map((c) => [c.id, c.name]),
);

export default function AttributionsPage() {
  const logos = getAllApprovedLogos();

  return (
    <div className="container attributions-page">
      <nav aria-label="Breadcrumb" className="breadcrumb">
        <Link to="/">Home</Link> › <span>Logo attributions</span>
      </nav>
      <header className="page-header">
        <h1>Logo attributions</h1>
        <p className="page-subtitle">
          Company logos displayed on this site are used under the licenses listed below.
        </p>
      </header>
      {logos.length === 0 ? (
        <p className="muted">No approved logos are registered yet.</p>
      ) : (
        <div className="attributions-table-wrap">
          <table className="attributions-table">
            <thead>
              <tr>
                <th scope="col">Company</th>
                <th scope="col">License</th>
                <th scope="col">Source</th>
                <th scope="col">Attribution</th>
              </tr>
            </thead>
            <tbody>
              {logos.map((entry) => (
                <tr key={entry.companyId}>
                  <td>{companyNameById[entry.companyId] ?? entry.companyId}</td>
                  <td>{entry.license}</td>
                  <td>
                    <a href={entry.sourceUrl} target="_blank" rel="noopener noreferrer">
                      Source
                    </a>
                  </td>
                  <td>
                    {entry.attribution && requiresAttribution(entry.license)
                      ? entry.attribution
                      : entry.usageNote ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
