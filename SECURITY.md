# Security Policy

## Reporting Security Vulnerabilities

If you discover a security vulnerability in GlobalOfficeFinder, please report it responsibly using GitHub's private security vulnerability reporting feature.

**DO NOT** create a public issue for security vulnerabilities.

### How to Report

1. Go to the [Security Advisories](../../security/advisories) page
2. Click "Report a vulnerability"
3. Complete the vulnerability report form with:
   - Description of the vulnerability
   - Steps to reproduce (if applicable)
   - Potential impact
   - Suggested fix (if you have one)

### What to Expect

- We will acknowledge receipt of your report within 48 hours
- We will investigate the vulnerability and respond with next steps
- We will notify you when a fix is released
- We will credit you in the security advisory (unless you prefer anonymity)

## Security Measures

This project implements multiple security measures to protect against common web vulnerabilities:

### Code Security
- **Static Analysis**: GitHub CodeQL runs on every commit
- **Dependency Scanning**: Dependabot monitors for vulnerable dependencies
- **Secrets Detection**: Gitleaks scans for accidentally committed credentials
- **Linting**: ESLint enforces code quality and security best practices

### Application Security
- **Content Security Policy (CSP)**: Prevents injection attacks
- **URL Sanitization**: All external URLs are validated
- **Safe DOM Rendering**: No innerHTML with untrusted data
- **XSS Prevention**: React escapes all JSX interpolations
- **CSRF Prevention**: No state-changing operations (static site)

### Deployment Security
- **HTTPS Only**: GitHub Pages enforces HTTPS
- **Least-Privilege Actions**: GitHub Actions use minimal required permissions
- **Reproducible Builds**: Locked dependencies via package-lock.json
- **Branch Protection**: Require reviews and passing checks before merge

### Data Security
- **No PII**: Public data only (company offices, not employee data)
- **Open Source**: Code is public and auditable
- **No Authentication**: Static site (no user accounts or passwords)

## Known Vulnerabilities

For known vulnerabilities and their status, see [npm audit results in Phase 8 Security Hardening](/.github/SECURITY_HARDENING.md#dependency-security).

Most vulnerabilities are in development dependencies and do not affect the production build.

## Security Updates

- We aim to deploy security fixes within 24-48 hours of identifying them
- Critical vulnerabilities receive immediate attention
- All security patches are deployed via the CI/CD pipeline with automated testing

## Best Practices for Users

- Keep your browser and operating system up to date
- Report any suspicious behavior or functionality
- Do not share sensitive information in the data (this is a public site)
- Verify office addresses before visiting

## Compliance & Standards

This project follows:
- **OWASP Top 10**: Mitigates common web vulnerabilities
- **WCAG 2.1 AA**: Accessibility standards
- **CWE/SANS Top 25**: Common weaknesses awareness

## Questions or Concerns?

If you have questions about security practices, please open a discussion in GitHub Discussions or contact the maintainers.
