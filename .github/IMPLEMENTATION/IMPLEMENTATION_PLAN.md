# GlobalOfficeFinder — Implementation Plan

This document codifies a phased, security-first implementation plan for GlobalOfficeFinder. It mirrors the planning produced during initial analysis and provides clear goals, tasks, security checks, deliverables, and estimated effort per phase. The file is placed under `.github/IMPLEMENTATION/` so it remains visible in the repository and is unlikely to be removed unintentionally.

How to use this file
- Treat each phase as a milestone. Create issues or PRs to implement the tasks in each phase.
- Run the listed security checks and add automated checks to CI where indicated.
- Update the estimates and status in the issue tracker as work progresses.

Phase 0 - Repository Audit (Discovery)
- Goal: Understand current repository state and capture gaps to inform scaffold and CI.
- Tasks:
  - Inspect repository for build files, package manager, workflows, and any data files.
  - List current dependencies and lockfile, license, and branch protection setup.
  - Produce a short audit with high-risk findings and prioritized fixes.
- Security checks:
  - Search for accidentally committed secrets or credentials.
  - Review Actions workflows for overly-broad permissions or unsafe patterns.
- Deliverable / Acceptance:
  - One-page audit describing state and 3–5 prioritized fixes.
- Estimate: 0.5–1 day

Phase 1 - Minimal Scaffold & Local Dev
- Goal: Create a reproducible dev environment and minimal UI that lists companies/offices from static JSON.
- Decision required: choose framework. Options: Vite + React + TypeScript (recommended), Astro, or plain HTML/CSS/JS.
- Tasks:
  - Initialize project scaffold with chosen stack and optional TypeScript.
  - Add structure: `src/`, `public/`, `data/` (companies.json, offices.json), and `.github/workflows/`.
  - Add tooling: ESLint, Prettier, basic CI for lint/test/build.
  - Implement a simple home page that loads and renders a small sample data set.
- Security checks:
  - Ensure existence of `.gitignore` and lockfile; pin direct dependency versions where possible.
  - Add Dependabot or a plan for dependency updates.
- Deliverable / Acceptance:
  - Local dev server runs and displays sample list; README updated with dev steps; CI job runs lint/build.
- Estimate: 1–2 days

Phase 2 - Data Model & Validation
- Goal: Define data schemas, create sample data, and ensure validation runs in CI.
- Tasks:
  - Define JSON Schema(s) for Company, Office, Country and store in `data/schema/`.
  - Create sample data files `data/companies.json` and `data/offices.json` matching the suggested model.
  - Implement a validation script (AJV or similar); add npm script `validate-data`.
  - Add CI step to run data validation on PRs and pushes.
- Security checks:
  - Schema should whitelist allowed fields and explicitly forbid PII unless required.
  - Reject or flag suspicious/embedded HTML in free-text fields.
- Deliverable / Acceptance:
  - JSON schemas + valid sample data + CI validation passing.
- Estimate: 1–2 days

Phase 3 - Search, Filtering & Listing
- Goal: Implement client-side search and filtering described in the README.
- Tasks:
  - Implement search-by-name (simple includes or Fuse.js for fuzzy search).
  - Implement country and region filters; add accessible UI controls.
  - Render office list cards with country, city, address, and optional link.
  - Add unit tests for search/filter logic (Vitest/Jest).
- Security checks:
  - Do not inject raw HTML from data; use textContent or a sanitizer.
  - Sanitize and validate any contactUrl before rendering.
- Deliverable / Acceptance:
  - Search + filters return correct results; tests cover search logic; accessibility smoke checks pass.
- Estimate: 2–3 days

Phase 4 - Company & Country Detail Pages + SEO
- Goal: Add detail pages for companies and countries with structured data and SEO.
- Tasks:
  - Implement route handling (static pre-rendering or client-side routing).
  - Company page: metadata + full office list.
  - Country page: companies with offices there and counts.
  - Add JSON-LD (schema.org) for company and locality pages.
- Security checks:
  - For external links add `rel="noopener noreferrer"` and validate URL schemes (allow only http/https).
  - Escape any description or metadata rendered as HTML.
- Deliverable / Acceptance:
  - Detail pages render correctly, produce valid JSON-LD, and are accessible.
- Estimate: 2–3 days

Phase 5 - Map View (Optional / Progressive)
- Goal: Provide an interactive map to visualize offices.
- Decision required: map provider. Options: Leaflet + OpenStreetMap (recommended, free) or Mapbox (requires token).
- Tasks:
  - Integrate chosen map library, add marker clustering for many points.
  - Clicking a marker opens a popup with office/company info and link to the detail page.
  - Precompute geocoding during data ingestion; avoid client runtime geocoding.
- Security checks:
  - If using Mapbox, store tokens in GitHub Secrets; avoid embedding private tokens client-side.
  - Avoid loading remote scripts without integrity checks; prefer bundling.
- Deliverable / Acceptance:
  - Map with markers and clustering, accessible fallback, and acceptable performance for the dataset.
- Estimate: 1–3 days

Phase 6 - CI/CD and GitHub Pages Deployment
- Goal: Automate build/test and deploy to GitHub Pages safely.
- Tasks:
  - Add GitHub Actions workflows: PR checks (lint, test) and main branch deploy (build -> artifact -> deploy to Pages).
  - Configure branch protection rules and require PR reviews for main.
  - Add Dependabot config and enable security alerts.
- Security checks:
  - Limit workflow permissions (use fine-grained permissions in workflow YAML).
  - Never commit secrets; use GitHub Secrets for tokens.
  - Use pages-deploy actions that support least-privilege.
- Deliverable / Acceptance:
  - Site auto-deploys on merges to main; PRs block merges on failing checks.
- Estimate: 1–2 days

Phase 7 - Tests, Performance & Accessibility
- Goal: Raise quality with automated tests and quality gates.
- Tasks:
  - Unit tests for core logic, component tests for UI.
  - E2E tests (Playwright) for user journeys.
  - Add Lighthouse CI or GitHub Actions integration and set baseline.
  - Run a11y checks (axe) in CI.
- Security checks:
  - Add dependency vulnerability scanning (Snyk or GitHub Code Scanning).
- Deliverable / Acceptance:
  - CI pipelines run tests and fail PRs on regressions; baseline Lighthouse and accessibility checks in place.
- Estimate: 2–4 days

Phase 8 - Security Hardening & Review
- Goal: Harden the static site and CI against common issues.
- Tasks:
  - Add and test a Content Security Policy (CSP).
  - Configure HTTP security headers where possible.
  - Run CodeQL / static scanning and review for XSS, open redirects, and other issues.
  - Lock down Actions permissions and enable required status checks.
- Security checks:
  - Ensure third-party libraries are bundled or loaded with SRI.
  - Audit data to verify no PII leakage.
- Deliverable / Acceptance:
  - Passing CodeQL and dependency vulnerability scans; CSP in place and tested.
- Estimate: 1–2 days

Phase 9 - Data Ops / Admin UX (Optional)
- Goal: Provide safe ways to update and moderate dataset at scale.
- Decision required: Git-based edits (PRs) vs admin UI.
- Tasks:
  - Decide content workflow: Git-based edits vs admin UI.
  - If admin UI: add authentication (GitHub OAuth or identity provider) and serverless functions to commit changes or open PRs.
  - Create validation + preview pipeline for proposed data changes.
- Security checks:
  - For admin UI, add auth, rate limiting, input validation, and audit logging.
- Deliverable / Acceptance:
  - Reliable data update process with validation and review.
- Estimate: 3–7 days (depending on approach)

Phase 10 - Monitoring, Documentation & Handover
- Goal: Operationalize and document the project.
- Tasks:
  - Add privacy-aware analytics and error reporting (Sentry or similar).
  - Produce runbook: how to update data, rotate secrets, and respond to incidents.
  - Create contributor docs and issue templates for data updates.
- Security checks:
  - Document incident escalation and secrets rotation steps.
- Deliverable / Acceptance:
  - Runbook, contributor docs, and basic monitoring in place.
- Estimate: 1–2 days

Acceptance Criteria (project-level)
- MVP site with search, filters, company & country pages, builds locally, and deploys to GitHub Pages.
- Data files validated against schema in CI.
- PRs must pass lint/tests before merge; branch protection enabled.
- Basic security hardening completed: CSP, dependency scanning, Actions least-privilege.
- E2E tests cover core flows and run in CI.

Security Checklist (high level)
- Enforce data validation and PII policy by schema.
- Always escape/sanitize data rendered in the browser.
- Use least-privilege for GitHub Actions and never commit secrets.
- Enable Dependabot and dependency vulnerability scanning.
- Add CSP and secure attributes for external links.
- Use HTTPS for hosting (GitHub Pages provides HTTPS by default).

Risks & Tradeoffs
- Client-side JSON keeps deployment trivial but exposes data publicly and can cause performance issues at scale. Consider server-side indexing if dataset becomes large.
- Map tokens: Mapbox improves UX but requires token management. Leaflet+OSM avoids tokens.
- Framework choice: React+TS is maintainable; plain JS is lighter. Pick based on team familiarity.

Open Questions (please answer to proceed)
1. UI stack preference: Vite+React+TS (recommended) / Astro / Plain HTML+JS
2. Map provider: Leaflet+OSM (recommended) / Mapbox (requires token)
3. Use TypeScript? Yes / No
4. Data workflow: Git-based (PRs) / Admin UI
5. Shall I run Phase 0 audit next? Yes / No

Next recommended step
- Run Phase 0: repository audit and produce the one-page findings report. This will let us start Phase 1 with exact actions.

Notes
- File is intentionally stored under `.github/IMPLEMENTATION/` so it remains visible in the repository and is easy to find from the web UI.
- Update this file as priorities change, and link issues/PRs to each phase.

---
Generated by the project assistant to capture the implementation plan for GlobalOfficeFinder.
