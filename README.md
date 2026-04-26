# GlobalOfficeFinder

Global Office Finder is a searchable web application for discovering and viewing company offices in different countries. Users can search by company name, country, city, or region, and explore international corporate footprints through interactive maps and detailed profiles.

Live site: [https://zetesel.github.io/GlobalOfficeFinder/](https://zetesel.github.io/GlobalOfficeFinder/)

## Features

- **Company Search**: Advanced filtering by name, industry, region, and office type.
- **Interactive Maps**: Global and local views of office locations with marker clustering.
- **Company & Country Profiles**: Deep dives into organizational presence and regional hubs.
- **SEO Optimized**: Structured JSON-LD data for all company and country pages.
- **Automated Data Pipeline**: Built-in scraper and review queue for maintaining up-to-date information.
- **Responsive Design**: Fully functional on desktop and mobile devices.

## Development

### Prerequisites

- Node.js 20+
- npm 9+

### Local Setup

```bash
npm ci                 # Install dependencies
npm run dev            # Start development server
npm run build          # Build for production
npm run lint           # Run linter
npm run validate-data  # Validate JSON data against schemas
npm run scrape:companies      # Run discovery/enrichment scraper
npm run test           # Run unit tests (vitest)
npm run test:e2e       # Run end-to-end tests (Playwright)
```

### Data Structure

- `data/companies.json`: Core company information.
- `data/offices.json`: Detailed office locations and contact info.
- `data/schema/`: JSON schemas used for data validation.

### Data Contribution

We welcome community contributions to expand our office directory.
1. Fork the repository.
2. Add company/office data to the JSON files in `data/`.
3. Run `npm run validate-data` to ensure compliance.
4. Submit a Pull Request.

## Architecture & Security

- **Static Deployment**: Hosted on GitHub Pages with automated CI/CD via GitHub Actions.
- **Security Hardening**: Strict Content Security Policy (CSP), secure headers, and automated secret scanning.
- **Quality Gates**: All PRs must pass data validation, linting, unit tests, and E2E scenarios.
- **Performance**: Automated baseline monitoring via Lighthouse CI.

## Documentation

- [CONTRIBUTING.md](CONTRIBUTING.md): Detailed guide for contributors.
- [RUNBOOK.md](RUNBOOK.md): Operational procedures for maintainers.
- [SECURITY.md](SECURITY.md): Security policy and reporting.
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md): Community standards.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
