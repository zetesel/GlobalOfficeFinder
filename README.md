# 🌐 GlobalOfficeFinder

Global Office Finder is a high-performance, searchable web application designed to centralize and visualize company office locations worldwide. It solves the fragmentation of corporate "contact us" pages by providing a single, unified interface for geographic discovery.

Live Site: [https://zetesel.github.io/GlobalOfficeFinder/](https://zetesel.github.io/GlobalOfficeFinder/)

---

## ✨ Key Features

- **🔍 Advanced Search & Filtering**: Real-time filtering by company name, industry, geographic region, and office type.
- **🗺️ Interactive Map Interface**: Global and local views utilizing Leaflet with high-performance marker clustering.
- **📊 Detailed Profiles**: Dedicated pages for companies and countries, providing deep insights into regional footprints.
- **⚡ Performance First**: Near-instant search results using [Fuse.js](https://fusejs.io/) and optimized static data loading.
- **🤖 Automated Data Pipeline**: Integrated scraper for data discovery, with a built-in review queue for data quality assurance.
- **📱 Fully Responsive**: Seamless experience across mobile, tablet, and desktop viewports.
- **🌐 SEO Optimized**: Full JSON-LD structured data support for automated search engine ingestion.

---

## 🛠️ Tech Stack

- **Core**: React 19, TypeScript, Vite
- **Routing**: React Router 7
- **Mapping**: Leaflet, Leaflet.markercluster
- **Search**: Fuse.js
- **Testing**: Vitest (Unit), Playwright (E2E), Lighthouse CI (Performance)
- **CI/CD**: GitHub Actions
- **Infrastructure**: GitHub Pages (Static Hosting)

---

## 📁 Project Structure

```text
├── data/
│   ├── companies.json          # Core company records
│   ├── offices.json            # Office location records
│   ├── schema/                 # JSON Schemas for data validation
│   └── scraper/                # Scraper metadata and review queue
├── scripts/
│   ├── scraper/                # Automated discovery and enrichment scripts
│   └── validate-data.mjs       # Data integrity validation tool
├── src/
│   ├── components/             # Reusable UI components (Map, Cards, etc.)
│   ├── pages/                  # Route-level components (Home, Company, Country)
│   ├── utils/                  # Shared business logic and filters
│   └── types/                  # TypeScript definitions
├── e2e/                        # Playwright E2E test suites
└── __tests__/                  # Vitest unit and integration tests
```

---

## 🚀 Development

### Prerequisites
- Node.js 20+
- npm 9+

### Quick Start
```bash
# Install dependencies
npm ci

# Start development server
npm run dev

# Run data validation
npm run validate-data

# Execute unit tests
npm run test

# Run E2E tests
npm run test:e2e
```

### Script Reference
| Command | Description |
|:---|:---|
| `npm run build` | Compiles production-ready static assets to `/dist`. |
| `npm run lint` | Performs static analysis via ESLint. |
| `npm run format` | Auto-formats code and data files via Prettier. |
| `npm run scrape:companies` | Runs the data discovery scraper. |
| `npm run validate-data` | Verifies JSON data against official schemas. |

---

## 🔄 Data Operations

### Manual Contributions
1. Fork the repository.
2. Update `data/companies.json` or `data/offices.json`.
3. Run `npm run validate-data` to ensure schema compliance.
4. Open a Pull Request.

### Automated Scraper
The discovery pipeline (`scripts/scraper/run-scraper.mjs`) can be configured via environment variables:
- `SCRAPER_DRY_RUN=1`: Run without modifying data files.
- `SCRAPER_CHECK_ROBOTS=0`: Disable robots.txt compliance checks (use with caution).
- `SCRAPER_MIN_SOURCE_TRUST`: Set minimum trust level (`high`, `medium`, `low`).

## Scraper Performance Hint
- For CI speedups, you can limit the number of sources the scraper processes by setting SCRAPER_MAX_SOURCES to a positive integer.
- Example: SCRAPER_MAX_SOURCES=1 SCRAPER_FETCH_PAGES=0 node scripts/scraper/run-scraper.mjs
- If SCRAPER_MAX_SOURCES is not set or <= 0, the scraper processes all sources as before.
- This change preserves data integrity since only the subset of sources is processed; the rest of the pipeline remains unchanged.

---

## 🛡️ Security & Quality

- **CSP**: Strict Content Security Policy enforced via Meta tags.
- **Validation**: Every PR undergoes rigorous automated schema validation and secret scanning.
- **Testing**: 100% logic coverage with Vitest and full critical-path coverage with Playwright.
- **Monitoring**: Performance baselines tracked via Lighthouse CI in every deployment.

---

## 📄 Documentation

- [CONTRIBUTING.md](CONTRIBUTING.md) - Guidelines for code and data contributions.
- [RUNBOOK.md](RUNBOOK.md) - Operational procedures and troubleshooting for maintainers.
- [SECURITY.md](SECURITY.md) - Security policy and vulnerability reporting.
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) - Community standards.

---

## 📜 License

Licensed under the [MIT License](LICENSE).
