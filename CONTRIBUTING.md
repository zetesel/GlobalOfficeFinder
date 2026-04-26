# Contributing to GlobalOfficeFinder

Thank you for your interest in contributing to GlobalOfficeFinder! This document provides guidelines for contributing company office data and code improvements.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Contributing Data](#contributing-data)
- [Contributing Code](#contributing-code)
- [Security Guidelines](#security-guidelines)
- [Reporting Issues](#reporting-issues)

## Code of Conduct

We are committed to providing a welcoming and inspiring community for all. Please read and adhere to our [Code of Conduct](CODE_OF_CONDUCT.md).

## Getting Started

### Prerequisites

- Node.js 20+
- npm 9+
- Git

### Local Setup

```bash
git clone https://github.com/zetesel/GlobalOfficeFinder.git
cd GlobalOfficeFinder
npm install
npm run dev        # Start dev server
npm run test       # Run tests
npm run validate-data  # Validate data files
```

### Development Workflow

1. Create a new branch: `git checkout -b feature/your-feature-name`
2. Make your changes
3. Run tests and validation: `npm run test && npm run validate-data`
4. Commit with descriptive messages: `git commit -m "feat: add feature description"`
5. Push to your fork: `git push origin feature/your-feature-name`
6. Open a pull request against `main`

## Contributing Data

### Data Quality Standards

All data must meet these standards to be merged:

#### 1. Accuracy
- Information must be from official, public sources
- Company websites, press releases, and public filings are preferred
- Data must be current (updated within last 12 months)
- Coordinates must be accurate within 0.01 degrees (~1km)

#### 2. Completeness
- Company name and website are required
- Industry and description are required
- At least one office must be provided
- Office address must include country and city

#### 3. Privacy & Security
- **NO personally identifiable information (PII)**
- No employee names, emails, or phone numbers
- No internal company information
- Only public, office-related data
- No sensitive locations or restricted areas

#### 4. Format & Validation
- All data must be valid JSON
- Must pass JSON schema validation
- No HTML or special formatting in text fields
- URLs must be valid and HTTPS only
- No duplicate entries

### Adding a New Company

#### Option 1: Use Issue Template (Recommended)

1. Go to [Issues](../../issues)
2. Click "New Issue"
3. Select "Add/Update Company"
4. Fill in all fields with accurate information
5. Submit for review

#### Option 2: Direct PR

1. Fork the repository
2. Edit `data/companies.json` and `data/offices.json`
3. Add company entry with format:
   ```json
   {
     "id": "company-id",
     "name": "Company Name",
     "website": "https://official-site.com",
     "industry": "Industry Category",
     "description": "Brief description of company...",
     "logo": "https://example.com/logo.png"
   }
   ```
4. Add office entries:
   ```json
   {
     "id": "company-id-city",
     "companyId": "company-id",
     "country": "Country Name",
     "countryCode": "CC",
     "region": "Region",
     "city": "City",
     "address": "Street address",
     "postalCode": "12345",
     "officeType": "Headquarters|Regional Office|Branch Office",
     "latitude": 40.7128,
     "longitude": -74.0060,
     "contactUrl": "https://example.com/contact"
   }
   ```
5. Run validation: `npm run validate-data`
6. Commit and open PR with description of changes
7. PR review and merge

### Data Validation

Before submitting, validate your changes locally:

```bash
npm run validate-data
```

This checks:
- Valid JSON format
- Schema compliance
- No duplicate entries
- All required fields present
- HTML injection detection
- Cross-reference integrity

### Automated discovery scraper

The project also supports a controlled scraper/enrichment pipeline:

```bash
npm run scrape:companies
```

Dry-run mode:

```bash
npm run scrape:companies:dry
```

Operational notes:
- Source candidates live under `data/scraper/sources/`
- Low-confidence or incomplete records are routed to `data/scraper/review-queue.json`
- Run audit metadata is stored in `data/scraper/last-run.json`
- Newly published scraped offices must include latitude/longitude to ensure map visibility
- Source hard filters, robots.txt checks, and per-source circuit breakers are enabled by default

### Data Sources

Preferred sources (in order):
1. Official company website / investor relations
2. Public company filings (SEC, etc.)
3. Press releases
4. News articles from reputable sources
5. Public databases (LinkedIn, Crunchbase, etc.)

**Avoid:**
- Unverified user submissions
- Internal company documents
- Speculation or assumptions
- Outdated information

### Geographic Coordinates

For latitude/longitude:

1. **Find accurate coordinates:**
   - Google Maps: Right-click on location → click coordinates
   - OpenStreetMap: Click location
   - GPS Coordinates: https://www.gps-coordinates.net/

2. **Verify accuracy:**
   - Compare with satellite view
   - Check address matches location
   - Accurate within ~1km acceptable

3. **Format:**
   - Use decimal format (e.g., 40.7128, -74.0060)
   - 4 decimal places minimum precision
   - Negative values for South/West

## Contributing Code

### Code Standards

- **Language**: TypeScript (strict mode)
- **Formatting**: Prettier (run with `npm run format`)
- **Linting**: ESLint (run with `npm run lint`)
- **Testing**: Vitest (run with `npm run test`)

### Making Code Changes

1. Follow the existing code style
2. Add tests for new features
3. Update documentation
4. Run all checks:
   ```bash
   npm run lint
   npm run test
   npm run validate-data
   npm run build
   ```

### Types of Changes

- **Bug fixes**: Start branch name with `fix/`
- **Features**: Start branch name with `feat/`
- **Documentation**: Start branch name with `docs/`
- **Refactoring**: Start branch name with `refactor/`
- **Tests**: Start branch name with `test/`

### Commit Messages

Follow conventional commits:

```
feat: add company detail page
fix: prevent XSS in office card
docs: update contributing guidelines
test: add search functionality tests
```

### Pull Request Process

1. Update PR template with your changes
2. Link related issues
3. Ensure all tests pass
4. Request review from maintainers
5. Address review comments
6. Rebase/merge when approved

## Security Guidelines

### Reporting Security Issues

**DO NOT** create public issues for security vulnerabilities.

Use GitHub's private [Security Advisories](../../security/advisories) to report:
- Potential XSS/injection vulnerabilities
- Authentication or authorization issues
- Sensitive data exposure
- Dependency vulnerabilities
- Other security concerns

### Security Best Practices

When contributing:
- Never commit secrets or credentials
- Validate all user input (even in static context)
- Sanitize external URLs
- Use `rel="noopener noreferrer"` for external links
- Follow CSP guidelines
- Never include PII in data or comments

### Dependency Updates

If updating dependencies:
- Use `npm update` or `npm install package@version`
- Verify security advisories: `npm audit`
- Test thoroughly before submitting PR
- Document breaking changes

## Reporting Issues

### Bug Reports

Include:
- Description of the bug
- Steps to reproduce
- Expected behavior
- Actual behavior
- Browser/OS information
- Screenshots (if applicable)

### Feature Requests

Include:
- Clear description of requested feature
- Use cases and benefits
- Proposed implementation (optional)
- Additional context

### Data Issues

For incorrect/outdated data:
- Specify which company/office
- Describe the issue
- Provide corrected information
- Link to public source

## Project Structure

```
├── src/                    # React components and pages
├── data/                   # Company and office data (JSON)
├── data/schema/           # JSON schemas for validation
├── scripts/               # Build and validation scripts
├── __tests__/             # Unit and component tests
├── e2e/                   # End-to-end tests
├── .github/
│   ├── workflows/         # CI/CD pipelines
│   ├── ISSUE_TEMPLATE/    # Issue templates
│   └── pull_request_template.md
├── index.html             # HTML entry point
├── package.json           # Dependencies and scripts
└── README.md              # Project documentation
```

## Testing Your Changes

### Unit Tests
```bash
npm run test
```

### E2E Tests
```bash
npm run test:e2e
```

### Data Validation
```bash
npm run validate-data
```

### Build
```bash
npm run build
```

### Linting & Formatting
```bash
npm run lint
npm run format
```

## Review Process

All contributions go through code review:

1. **Automated Checks**: CI/CD pipeline must pass
   - Tests must pass
   - Linting must pass
   - Build must succeed
   - Data validation must pass

2. **Manual Review**: Maintainers review for:
   - Code quality and style
   - Test coverage
   - Security concerns
   - Documentation clarity
   - Data accuracy (for data PRs)

3. **Approval**: At least one maintainer approval required

4. **Merge**: Squash commit and merge to `main`

## Community

- **Discussions**: [GitHub Discussions](../../discussions)
- **Issues**: [Bug reports and features](../../issues)
- **Wiki**: [Project wiki](../../wiki)

## License

By contributing to GlobalOfficeFinder, you agree that your contributions will be licensed under the project's license. See [LICENSE](LICENSE) for details.

## Questions?

- Check [Discussions](../../discussions) for answers
- Open an issue with tag `question`
- Review existing documentation in `.github/`

---

Thank you for contributing to GlobalOfficeFinder! 🙏
