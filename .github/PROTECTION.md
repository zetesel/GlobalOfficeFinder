# Branch‑Protection Checklist (Phase 0)

- Protect `main`:
  - Require pull‑request reviews (≥ 1 approver).
  - Require status checks to pass (`validate-data`, `lint-and-build`).
  - Disallow force pushes.
  - Enable “Require linear history” if desired.
- Enable “Require signed commits” (optional but recommended).
- Ensure Dependabot alerts and security updates are turned on in **Settings → Code security and analysis**.
