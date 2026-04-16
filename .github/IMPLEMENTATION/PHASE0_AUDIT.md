# Phase 0 — Repository Audit (Discovery)

Date: 2026-04-16
Local branch inspected: security/add-secret-scan

Summary
-------
This short audit summarizes the repository state observed during a Phase‑0 review and lists a small set of prioritized fixes. The repository already includes a functioning scaffold (Vite + React), data files and JSON schemas, an AJV-based validation script, and GitHub Actions for PR checks and Pages deployment. A secret-scan action (gitleaks) is present in PR checks, but a historical secret scan has not been performed.

Inventory & evidence
--------------------
- Data and validation
  - data/companies.json, data/offices.json
  - data/schema/companies.schema.json, data/schema/offices.schema.json
  - scripts/validate-data.mjs (AJV validator + cross-reference checks)
  - package.json with npm script `validate-data`
- CI and automation
  - .github/workflows/pr-checks.yml (PR: secret scan, npm ci, validate-data, lint, build)
  - .github/workflows/deploy.yml (push to main: validate-data, build, upload -> deploy Pages)
  - gitleaks action used in PR checks (args: `-v` — verbose scan of the git diff / PR contents)
  - .github/dependabot.yml present
- Misc
  - package-lock.json, LICENSE, README and IMPLEMENTATION_PLAN.md

Quick checks performed during this audit
--------------------------------------
- Quick grep for common secret patterns (AWS keys, private-key headers, .env) found no matches in the working tree. This is a shallow check and not a substitute for a history scan.
- I attempted to run npm scripts in the analysis environment, but `npm` was not available here; CI will execute `npm ci` and `npm run validate-data` as configured.

Findings and risk assessment
----------------------------
- Data validation: Good — a validation script is present and wired into CI; schemas use `additionalProperties: false` which helps reduce unexpected fields.
- Secret scanning: gitleaks is configured in PR checks but uses `--no-git`, so it scans the PR/worktree only and will not detect secrets that were committed and later removed from history. A full historical scan is required to be confident there are no leaked secrets.
- CI permissions: PR checks use `contents: read`. The deploy workflow requires `pages: write` and `id-token: write` (expected for Pages deploy). Prefer scoping these permissions to the deploy job only.
- Branch protection and repository settings (Dependabot, security alerts) cannot be determined from the files alone and must be confirmed in the GitHub repository settings.

Prioritized fixes (actionable)
------------------------------
1) Full repository secret scan and remediation (High)
   - Run a full-history secret scan (e.g. `gitleaks detect --source . --report-format json --report-path gitleaks-report.json`).
   - If secrets are found: rotate compromised credentials immediately, then remove them from history using a safe history-rewrite tool (git-filter-repo recommended). Do not attempt history rewrite before rotation.
   - Add a persistent `.gitleaks.toml` and ensure the PR-check job fails on detection (tighten rules as needed).

2) Enforce branch protection and required status checks (High)
   - Configure `main` branch protection: require PRs, require 1+ reviewers, require passing status checks (include validate-data and lint-and-build), block force pushes.
   - Ensure deploys to Pages are gated behind protected merges.

3) Harden CI and add SAST (Medium)
   - Scope workflow `permissions` to least privilege and set deploy-only permissions at the deploy job level.
   - Add CodeQL (or other code scanning) to detect code-level issues early.
   - Verify Dependabot is enabled in repository settings and enable automatic security updates where appropriate.

4) Data governance & runtime sanitization (Medium)
   - Add a short PII/data policy and an owner for data changes (who may add/approve companies/offices).
   - Tighten `validate-data` to reject embedded HTML in descriptive fields and assert contactUrl schemes (https only) where desired.
   - Plan for CSP and SRI as part of Phase 8.

Acceptance criteria for Phase 0
------------------------------
- This audit file exists in the repo (this file).
- A historical secret scan completed with either (a) no findings, or (b) findings that have been rotated and removed from history.
- Branch protection is configured so PR checks block merges to `main` (validate-data + lint/build required).
- Dependabot/security alerts enabled and a plan for code scanning (CodeQL or equivalent) is in place.

Next steps I can take for you
---------------------------
- Run a full gitleaks history scan and attach the report (requires gitleaks available in runtime).
- Add `.gitleaks.toml` and a stricter gitleaks configuration file and PR-check changes.
- Add a minimal CodeQL workflow and/or an example job-scoped permissions change for deploy.

Signed: OpenCode — Phase‑0 short audit
