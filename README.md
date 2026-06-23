# GlobalOfficeFinder

Global Office Finder is a high-performance, searchable web application designed to centralize and visualize company office locations worldwide. It solves the fragmentation of corporate "contact us" pages by providing a single, unified interface for geographic discovery.

Live Site: [https://zetesel.github.io/GlobalOfficeFinder/](https://zetesel.github.io/GlobalOfficeFinder/)

---

## Key Features

- **Advanced Search & Filtering**: Explicit Search button with local filtering by company name, industry, geographic region, and office type.
- **Interactive Map Interface**: Global and local views utilizing Leaflet with high-performance marker clustering.
- **Detailed Profiles**: Dedicated pages for companies and countries, providing deep insights into regional footprints.
- **Performance First**: Near-instant search results using optimized static data loading.
- **Automated Data Pipeline**: Integrated scraper for data discovery and a CI batch verification job that flags suspect offices for human review.
- **Static Review Page** (`/review`): Lists offices flagged as rejected by the CI verification job; provides editable fields and a copy-to-clipboard JSON snippet for opening a correction PR.
- **Fully Responsive**: Seamless experience across mobile, tablet, and desktop viewports.

---

## Tech Stack

- **Core**: React 19, TypeScript, Vite
- **Routing**: React Router 7
- **Mapping**: Leaflet, Leaflet.markercluster
- **Testing**: Vitest (Unit), Playwright (E2E)
- **CI/CD**: GitHub Actions
- **Hosting**: GitHub Pages (100% static — no server, no Vercel)

---

## Project Structure

```text
├── data/
│   ├── companies.json          # Core company records
│   ├── offices.json            # Office location records (may contain `verification` field)
│   ├── schema/                 # JSON Schemas for data validation
│   └── scraper/                # Scraper metadata and review queue
├── scripts/
│   ├── scraper/                # Automated discovery and enrichment scripts
│   │   └── verify-offices.mjs  # CI batch verifier (calls OpenRouter, writes verdicts)
│   ├── lib/                    # Shared helpers (wikidata, wikimedia, verify-prompt)
│   └── validate-data.mjs       # Data integrity validation tool
├── src/
│   ├── components/             # Reusable UI components (Map, Cards, etc.)
│   ├── pages/                  # Route-level components (Home, Company, Country, Review)
│   ├── hooks/useData.ts        # Data hook — exposes `offices` (all) and `publicOffices` (non-rejected)
│   └── types/                  # TypeScript definitions
├── e2e/                        # Playwright E2E test suites
└── __tests__/                  # Vitest unit and integration tests
```

---

## Development

### Prerequisites
- Node.js 20+
- npm 9+

### Quick Start
```bash
# Install dependencies
npm ci

# Start development server (static SPA only)
npm run dev

# Run data validation
npm run validate-data

# Execute unit tests
npm run test

# Run E2E tests (requires a running dev server)
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
| `npm run verify:offices` | Runs the CI batch verifier (requires `OPENROUTER_API_KEY` in env). |

---

## Data Operations

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

### Scraper Performance
For CI speedups, limit the number of sources processed with `SCRAPER_MAX_SOURCES`:
```bash
SCRAPER_MAX_SOURCES=1 SCRAPER_FETCH_PAGES=0 node scripts/scraper/run-scraper.mjs
```

---

## CI Batch Verification (`verify:offices`)

The `verify-offices.yml` workflow runs on a schedule (and on demand). It:

1. Reads `data/offices.json` and `data/companies.json`.
2. For each office missing a `verification` verdict (or with `verdict === "unverified"`), calls OpenRouter to verify whether the office plausibly belongs to the company.
3. Writes verdicts back into `data/offices.json` and opens a PR via `peter-evans/create-pull-request`.

Offices with `verdict === "rejected"` are hidden from the public catalogue (filtered in `useData.publicOffices`) and surfaced on the `/review` page for human correction before promoting via a PR.

### Secrets

| Secret / Variable | Where it lives | Purpose |
|:---|:---|:---|
| `OPENROUTER_API_KEY` | GitHub repository secret (`Settings → Secrets → Actions`) | OpenRouter key for the `verify:offices` CI batch job. Server-side only — never bundled. |
| `OPENROUTER_MODEL` | GitHub repository secret (optional) | Model for verification. Defaults to `anthropic/claude-3.5-sonnet`. |

> There is no runtime backend. The GitHub Pages deployment is 100% static.
> `OPENROUTER_API_KEY` is used exclusively in GitHub Actions (the batch verify workflow).

---

## Security & Quality

- **Validation**: Every PR undergoes rigorous automated schema validation and secret scanning (gitleaks).
- **Testing**: Logic coverage with Vitest and full critical-path coverage with Playwright.

---

## Documentation

- [CONTRIBUTING.md](CONTRIBUTING.md) - Guidelines for code and data contributions.
- [SECURITY.md](SECURITY.md) - Security policy and vulnerability reporting.
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) - Community standards.

---

## License

Licensed under the [MIT License](LICENSE).
