import { Link } from "react-router-dom";
import { DISCLAIMER_SHORT } from "../content/legal";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <p>
          GlobalOfficeFinder — open source directory of company offices worldwide.
        </p>
        <p className="footer-disclaimer">{DISCLAIMER_SHORT}</p>
        <p className="footer-meta">
          <Link to="/legal">Legal</Link>
          {" · "}
          <Link to="/attributions">Logo attributions</Link>
          {" · "}
          ©{" "}
          <a
            href="https://github.com/zetesel/GlobalOfficeFinder"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </p>
      </div>
    </footer>
  );
}
