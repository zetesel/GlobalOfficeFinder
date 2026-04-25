# GlobalOfficeFinder

Global Office Finder is a searchable web application for discovering and viewing company offices in different countries. Users can search by company name, country, city, or region, then open a company profile to see where that organization has offices worldwide. The project is intended to run as a static website, with GitHub Actions handling the build and deployment workflow and GitHub Pages serving the final site.

## Purpose

Many large companies publish office locations across separate pages, regional directories, or corporate contact sections, which makes comparison and discovery slow. This project aims to centralize that information into one clean interface where users can quickly find where a company operates and explore its presence by geography.

## Main idea

The application should help users answer questions like:
- In which countries does this company have offices?
- Which companies have offices in a specific country?
- What cities host offices for a given company?
- How broad is a company’s international footprint?

The core experience should combine search, filtering, and browsing. Users should be able to type a company name, select a country, and immediately view matching office locations in a structured way.

## Core features

- Company search by name
- Country and region filters
- Office listings with country, city, address, and optional website/contact link
- Company detail page showing all known offices
- Country detail page showing all companies with offices there
- Optional map view for visual browsing
- Responsive UI for desktop and mobile

## Suggested data model

A simple structured dataset will work well for a static deployment. Office data can be stored in JSON and loaded client-side in the browser.

Example entities:
- **Company**: id, name, website, industry, logo, description
- **Office**: id, companyId, country, city, address, postalCode, latitude, longitude, officeType, contactUrl
- **Country**: code, name, region

This approach keeps the project lightweight and easy to version in GitHub.

## Technical approach

The project should be built as a static front end, for example with plain HTML, CSS, and JavaScript, or with a static-site-friendly framework such as Astro, Vite, or another generator that outputs static files.

A basic deployment flow would be:
1. Push changes to the `main` branch
2. GitHub Actions installs dependencies and builds the project
3. The workflow uploads the built site as an artifact
4. GitHub Pages publishes the generated static output

## Deployment idea

GitHub Pages is a good default hosting choice because it is designed for static websites stored in GitHub repositories. If later more flexibility is needed, a similar static hosting platform such as Cloudflare Pages, Netlify, or Vercel could also be considered, but GitHub Pages is the most natural starting point for a repository-centered project with Actions-based deployment.

## Suggested structure

A practical project structure could look like this:

- `src/` for UI code
- `public/` for static assets
- `data/companies.json` for company records
- `data/offices.json` for office records
- `.github/workflows/deploy.yml` for automated deployment
- `README.md` for project documentation

## Future improvements

Once the first version works, the project could be extended with:
- Interactive world map
- Search suggestions and autocomplete
- Import pipeline from curated company datasets
- Office count statistics by company or country
- “Last updated” metadata for each company profile
- Admin-style data validation before publishing

## Project goal

The goal is to build a clean, searchable, and maintainable directory of company offices worldwide that is easy to host, easy to update, and free to deploy in its initial form. Using a static architecture with GitHub Actions and GitHub Pages keeps the project simple while still supporting automation and a professional public website.

---

## Development

### Prerequisites

- Node.js 20+
- npm 9+

### Local setup

```bash
npm run validate-data  # Validate JSON data against schemas
npm run test           # Run unit and component tests (vitest)
npm run test:e2e       # Run end-to-end tests (Playwright)
npm run test:e2e:ui    # Run E2E tests with interactive UI
```

### Project structure

```
├── data/
│   ├── companies.json          # Company records
│   ├── offices.json            # Office records
│   └── schema/
│       ├── companies.schema.json
│       └── offices.schema.json
├── scripts/
│   └── validate-data.mjs       # Data validation script (run in CI)
├── src/
│   ├── components/             # Reusable UI components
│   ├── hooks/                  # Custom React hooks
│   ├── pages/                  # Route-level page components
│   ├── types/                  # TypeScript type definitions
│   └── utils/                  # Utility functions
├── .github/
│   ├── workflows/
│   │   ├── pr-checks.yml           # PR validation: data + lint + test + build + secret scan
│   │   ├── deploy.yml              # Automatic deploy to GitHub Pages on push to main (with tests)
│   │   ├── codeql.yml              # Security scanning (JavaScript/TypeScript)
│   │   ├── e2e-tests.yml           # E2E and Lighthouse CI tests
│   │   └── full-secret-scan.yml    # Daily historical secret detection
│   ├── dependabot.yml              # Automated dependency updates
│   └── PROTECTION.md               # Branch protection configuration guide
├── __tests__/
│   ├── components/                 # Component test files
│   ├── utils/                      # Utility function test files
│   └── hooks/                      # Hook test files
├── e2e/
│   └── main.spec.ts                # End-to-end test suite (Playwright)
├── vitest.config.ts                # Vitest unit test configuration
├── playwright.config.ts            # Playwright E2E test configuration
├── lighthouserc.json               # Lighthouse CI performance thresholds
└── public/                     # Static assets copied as-is to build output
```

### Adding data

Edit `data/companies.json` and `data/offices.json`. Run `npm run validate-data` to check your changes against the JSON schemas before opening a PR.

### Deployment

Pushes to `main` automatically build and deploy the site to GitHub Pages via the `deploy.yml` workflow. The deploy workflow uses fine-grained permissions (`pages: write`, `id-token: write`) and a concurrency guard so only one deploy runs at a time.

#### Phase 6: CI/CD & GitHub Pages

The project is fully configured with automated CI/CD and secure deployment:

**Automated Quality Checks (on every PR):**
- `pr-checks.yml`: Validates data integrity, runs ESLint, and builds the project
- `codeql.yml`: Static security analysis using GitHub CodeQL (JavaScript/TypeScript)
- Secret scanning via gitleaks to prevent accidental credential commits
- JSON schema validation for companies and offices data

**Deployment to GitHub Pages (on push to `main`):**
- `deploy.yml`: Builds production bundle and deploys to GitHub Pages
- All secrets are stored in GitHub repository settings (never committed)
- Least-privilege IAM: workflows only request necessary permissions
- Branch protection enforced: requires 1 PR review + passing checks before merge
- Live site: https://zetesel.github.io/GlobalOfficeFinder/

**Security & Monitoring:**
- Dependabot configured for automated dependency updates
- Daily gitleaks scans for historical secret detection
- No force-pushes allowed on `main` branch
- Admin approval required for any protection bypass

To view or trigger workflows manually:
```bash
gh workflow list                    # List all workflows
gh workflow run deploy.yml          # Manually trigger deployment
```

#### Phase 7: Tests, Performance & Accessibility

Comprehensive testing and quality gates ensure code reliability and user experience:

**Unit & Component Tests (Vitest):**
- 52 test cases covering core logic and UI components
- Tests for CompanyCard, OfficeCard, Header, Footer components
- Utility function tests: sanitizeUrl, getCountrySummaries
- 100% coverage of tested modules
- `npm run test` - Run all unit tests
- `npm run test -- --coverage` - Generate coverage report

**End-to-End Testing (Playwright):**
- Multi-browser testing: Chrome, Firefox, Safari
- Mobile viewport testing: Pixel 5, iPhone 12
- User journey tests: search, filtering, navigation
- Accessibility validation with axe-core
- `npm run test:e2e` - Run headless E2E tests
- `npm run test:e2e:ui` - Run with interactive UI

**Automated Accessibility Checks:**
- WCAG 2.1 Level AA compliance testing
- Keyboard navigation validation
- Screen reader compatibility checks
- Color contrast analysis
- Integrated into E2E test suite

**Performance Monitoring (Lighthouse CI):**
- Automated performance baselines
- Configuration thresholds:
  - Performance: ≥80
  - Accessibility: ≥90
  - Best Practices: ≥90
  - SEO: ≥90
- Tests on HomePage, CompanyPage, CountryPage
- Reports available in GitHub Actions artifacts

**CI/CD Integration:**
- `pr-checks.yml`: Unit tests run on every PR
- `deploy.yml`: Tests required before deployment to main
- `e2e-tests.yml`: E2E and Lighthouse tests on PR/push/schedule
- Tests block PR merge on failure (via branch protection)

#### Phase 8: Security Hardening

Production-ready security measures protect against common web vulnerabilities:

**Content Security Policy (CSP):**
- Strict policy via HTML meta tags (GitHub Pages limitation)
- Prevents inline script injection: `script-src 'self'`
- Prevents inline style injection: `style-src 'self'`
- Restricts external resources to HTTPS
- Disables frame embedding: `frame-ancestors 'none'`

**Security Headers:**
- X-Content-Type-Options: nosniff (prevent MIME-type sniffing)
- X-Frame-Options: DENY (prevent clickjacking)
- Referrer-Policy: strict-origin-when-cross-origin (limit referrer leakage)
- Permissions-Policy: Disable unused features (geolocation, microphone, camera, payment)

**Code Security:**
- GitHub CodeQL analysis on every commit (JavaScript/TypeScript)
- ESLint with security rules
- All external URLs validated (no protocol injection)
- Safe DOM rendering (no innerHTML with untrusted data)

**Dependency Security:**
- Dependabot monitors for vulnerable dependencies
- All dependencies pinned in package-lock.json
- npm audit tracks known vulnerabilities
- Development dependencies isolated from production

**GitHub Actions Security:**
- All workflows use least-privilege permissions
- Action versions pinned to specific releases
- No hardcoded credentials (uses GitHub Secrets)
- Deployment uses OIDC authentication

**Data Security:**
- No PII in public data (audited)
- Public company offices only
- Data validation against JSON schemas
- Strict data policy in place

**Deployment Security:**
- HTTPS enforced by GitHub Pages
- DDoS protection included
- Reproducible builds (locked dependencies)
- Branch protection requires reviews + passing checks

**Documentation:**
- [Security Policy](SECURITY.md) - Responsible disclosure
- [Security Hardening Guide](.github/SECURITY_HARDENING.md) - Technical details

For security vulnerabilities, report via [GitHub Security Advisories](../../security/advisories).

#### Phase 9: Data Operations & Community

Community contributions are welcome and follow a structured PR workflow:

**Contributing:**
- See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines
- Two ways to contribute: add/update company data or improve the codebase
- Data changes use issue templates for standardized submissions
- All pull requests must pass validation and review

**Issue & PR Templates:**
- `Add Company Data` issue template: Use for proposing new companies/offices
- PR template: Standardized format for all contributions (data or code)
- All PRs require passing checks and at least one review before merge

**Data Contribution Workflow:**
1. Open an issue using the "Add Company Data" template
2. Discuss verification and details with maintainers
3. Fork the repository and create a feature branch
4. Update `data/companies.json` and `data/offices.json`
5. Run `npm run validate-data` to verify JSON schema compliance
6. Submit a PR with description of changes
7. Maintainers verify accuracy and approve/merge

**Community Guidelines:**
- See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for community standards
- Respectful, inclusive environment for all contributors
- Questions and discussions welcome on issues and discussions

#### Phase 10: Monitoring & Handover

Operational procedures and runbook for ongoing maintenance:

**Runbook & Operations:**
- See [RUNBOOK.md](RUNBOOK.md) for complete operational procedures
- Contains: deployment procedures, incident response, scaling guidelines
- Troubleshooting guide for common issues
- Monitoring and performance checks

**Key Operations:**
- **Deployments**: Automatic via `deploy.yml` on push to `main`
- **Manual triggers**: `gh workflow run deploy.yml`
- **Rollback**: Revert commit and push to `main`
- **Incident response**: See incident response section in RUNBOOK.md
- **Performance monitoring**: Check Lighthouse CI reports in GitHub Actions
- **Security updates**: Dependabot PRs merged weekly
- **Data validation**: Runs on every PR via `npm run validate-data`

**Maintenance Schedule:**
- Review and merge Dependabot updates weekly
- Check GitHub security advisories for alerts
- Review E2E test results in GitHub Actions dashboard
- Monitor GitHub Pages deployment logs
- Respond to contributor issues and PRs

**Support & Questions:**
- Open discussions for questions about the project
- Bug reports via GitHub issues
- Security vulnerabilities: [GitHub Security Advisories](../../security/advisories)
- General inquiries: Check existing issues first, then open a new one

**Project Status:**
- ✅ All 10 implementation phases complete
- ✅ Production-ready with comprehensive testing and security
- ✅ GitHub Actions CI/CD fully automated
- ✅ Community contribution processes in place
- ✅ Documentation complete and maintained
- Live site: https://zetesel.github.io/GlobalOfficeFinder/
