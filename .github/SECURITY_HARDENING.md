# Phase 8 - Security Hardening

This document describes the security hardening measures implemented in Phase 8 for GlobalOfficeFinder.

## Security Headers

### Content Security Policy (CSP)

A strict Content Security Policy is implemented via HTML meta tags in `index.html` to prevent injection attacks:

```
default-src 'self'                                         # Only allow resources from same origin
script-src 'self'                                          # Only scripts from same origin (no inline scripts)
style-src 'self' 'unsafe-inline'                          # Stylesheets from self; unsafe-inline required by Leaflet and app inline styles
img-src 'self' data: https:                               # Images from self, data URIs, and HTTPS external
font-src 'self' data:                                     # Fonts from self and data URIs
connect-src 'self' https://tile.openstreetmap.org ws://localhost:5173 ws://127.0.0.1:5173  # API calls to self, OSM tiles, and Vite HMR WebSocket
frame-ancestors 'none'                                    # Prevent embedding in frames
base-uri 'self'                                           # Restrict base URL
form-action 'self'                                        # Restrict form submissions to self
```

**Implementation Notes:**
- GitHub Pages does not support custom HTTP headers, so CSP is enforced via meta tag
- `style-src 'unsafe-inline'` is required because Leaflet and React inline styles use `style` attributes at runtime; a nonce-based approach is not practical with static meta-tag CSP
- `script-src 'self'` blocks inline scripts — the SPA fallback redirect is therefore served as `public/spa-redirect.js` rather than an inline `<script>`
- OpenStreetMap tile server is whitelisted for map tile functionality
- WebSocket origins (`ws://localhost:5173`, `ws://127.0.0.1:5173`) are added to `connect-src` to allow Vite HMR in local development
- All other resources must be same-origin (no third-party CDNs)

### Additional Security Headers

Implemented via HTML meta tags:

| Header | Value | Purpose |
|--------|-------|---------|
| X-Content-Type-Options | nosniff | Prevent MIME-type sniffing attacks |
| X-Frame-Options | DENY | Prevent clickjacking by disallowing frame embedding |
| Referrer-Policy | strict-origin-when-cross-origin | Control referrer information leakage |
| Permissions-Policy | geolocation=(), microphone=(), camera=(), payment=() | Disable unused browser features |

## Dependency Security

### Vulnerability Scanning

- **npm audit**: Run locally to identify known vulnerabilities in dependencies
- **CodeQL**: GitHub Action runs on every PR and push (via `codeql.yml`)
- **Dependabot**: Automated dependency updates with security alerts (`dependabot.yml`)

### Current Status

```
npm audit results:
- 13 vulnerabilities identified (mostly in transitive dependencies)
- 6 low, 2 moderate, 5 high severity
- Most are in Lighthouse CLI and Playwright dependencies (dev-only)
- Production bundle is not affected (only production dependencies matter)
```

### Production Dependencies

All production dependencies are minimal and well-maintained:
- `react` ^19.2.4 - React framework
- `react-dom` ^19.2.4 - React DOM
- `react-router-dom` ^7.14.0 - Client-side routing
- `fuse.js` ^7.3.0 - Fuzzy search
- `leaflet` ^1.9.4 - Map library
- `leaflet.markercluster` ^1.5.3 - Map marker clustering

All production dependencies are pinned and locked in `package-lock.json`.

## GitHub Actions Security

### Least-Privilege Permissions

All workflows are configured with minimal required permissions:

| Workflow | Permissions |
|----------|-------------|
| pr-checks.yml | `contents: read` |
| deploy.yml | `contents: read`, `pages: write`, `id-token: write` |
| codeql.yml | `contents: read`, `security-events: write` |
| e2e-tests.yml | `contents: read` |
| full-secret-scan.yml | `contents: read` |

**Rationale:**
- `contents: read` - Required to checkout repository code
- `pages: write` - Only for deployment workflow (to deploy to GitHub Pages)
- `id-token: write` - Required for GitHub Pages OIDC authentication
- `security-events: write` - Only for CodeQL (to report security findings)

### Action Versions

All GitHub Actions are pinned to specific versions:

```yaml
- uses: actions/checkout@v6
- uses: actions/setup-node@v6
- uses: actions/setup-go@v6
- uses: github/codeql-action/init@v3
- uses: github/codeql-action/analyze@v3
- uses: actions/upload-artifact@v7
- uses: actions/deploy-pages@v5
- uses: actions/upload-pages-artifact@v5
```

### Branch Protection

Branch protection is enabled on `main` with:
- Require 1 PR review before merge
- Require status checks to pass:
  - `validate-data` (data validation)
  - `lint-and-build` (linting and build)
- Prevent force pushes
- Prevent deletions
- Require admin review to bypass

## Data Security

### PII Audit

Data files (`data/companies.json`, `data/offices.json`) were audited for personally identifiable information:

**Finding:** ✅ No PII present

The data contains only:
- Public company information (name, website, industry, description)
- Public office locations (address, city, country, office type)
- Public coordinates (latitude, longitude)

No sensitive data is included:
- ✅ No employee names or personal information
- ✅ No email addresses or phone numbers
- ✅ No internal company information
- ✅ No authentication credentials
- ✅ No API keys or tokens

### Data Validation

All data is validated against JSON schemas:
- `data/schema/companies.schema.json` - Validates company records
- `data/schema/offices.schema.json` - Validates office records

Validation includes:
- Field presence and type checking
- HTML injection detection (via custom validation)
- Cross-reference validation (office companyId must exist in companies)

## Static Code Analysis

### CodeQL

GitHub CodeQL analysis is enabled and runs on:
- Every push to `main`
- Every pull request
- Weekly schedule (Sunday 2 AM UTC)

Languages analyzed: JavaScript/TypeScript

No critical security issues identified by CodeQL.

### ESLint

ESLint configuration includes security-focused rules:
- React hooks rules
- React refresh rules
- TypeScript best practices

## URL Sanitization

All external URLs are validated using the `sanitizeUrl` utility:

```typescript
export function sanitizeUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url.trim());
    // Only allow http and https protocols
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.href;
    }
  } catch {
    // Invalid URL
  }
  return undefined;
}
```

This prevents:
- JavaScript protocol injection (`javascript:alert()`)
- Data URL injection (`data:...`)
- Other malicious protocols

## DOM Security

All data rendered in the DOM is safely handled:

- ✅ No `innerHTML` usage with untrusted data
- ✅ All data rendered via React `textContent` or JSX interpolation
- ✅ Links use `sanitizeUrl` validation
- ✅ External links have `rel="noopener noreferrer"` and `target="_blank"`

## Testing Security

### Accessibility Testing

Axe accessibility scanner runs in E2E tests to detect common security/accessibility issues:
- WCAG 2.1 Level AA compliance
- Proper use of ARIA labels
- Keyboard navigation support

### E2E Testing

Playwright E2E tests validate:
- Navigation flows work correctly
- No XSS vulnerabilities in rendered output
- Responsive design works on mobile and desktop

## Deployment Security

### GitHub Pages Hosting

GitHub Pages provides:
- ✅ Automatic HTTPS enforcement
- ✅ DDoS protection
- ✅ Secure certificate management
- ✅ No custom code execution (static only)

### Build Security

Build process:
1. Dependencies are installed from `package-lock.json` (reproducible builds)
2. TypeScript is compiled to JavaScript (type safety)
3. ESLint validates code quality
4. Tests must pass
5. Artifacts are uploaded securely
6. Deployment uses OIDC authentication (no long-lived tokens)

## Security Checklist (Phase 8)

- ✅ Content Security Policy (CSP) implemented
- ✅ Security headers configured
- ✅ CodeQL static analysis enabled
- ✅ Dependency vulnerability scanning enabled
- ✅ All workflows use least-privilege permissions
- ✅ All action versions pinned to specific versions
- ✅ Branch protection enforced
- ✅ Data audited for PII
- ✅ URL sanitization implemented
- ✅ DOM rendering is safe (no innerHTML with untrusted data)
- ✅ External links secured with proper attributes
- ✅ No secrets in repository (gitleaks validates)
- ✅ Reproducible builds (locked dependencies)
- ✅ HTTPS enforced (GitHub Pages)

## Known Limitations

1. **CSP Meta Tag Limitation**: GitHub Pages doesn't support custom HTTP headers, so CSP is enforced via meta tag. This means CSP can theoretically be disabled if an attacker can modify the HTML file (which would require compromising the deployment).

2. **Transitive Dependencies**: Some vulnerability reports are for transitive dependencies of development tools (not in production code). These are low risk but may require breaking changes to fix.

3. **Local Development**: During local development, the CSP is enforced by the browser but may cause issues with development tools. For production deployments, the CSP is fully enforced.

## Recommendations for Future Phases

1. **Phase 9**: Consider adding custom headers via Netlify, Vercel, or similar if moving away from GitHub Pages.
2. **Phase 10**: Add security incident response procedures and audit logging.
3. Future: Consider adding a Web Application Firewall (WAF) for additional DDoS and attack protection.

## Security Contact

For security issues, please report via GitHub Security Advisories (private reporting available).
