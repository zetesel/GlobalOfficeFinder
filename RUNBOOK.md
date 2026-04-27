# Runbook: Scraper Automation & Promotion

This runbook documents the scraper staging -> promotion flow, how to enable automated PR creation, and troubleshooting steps.

1) Purpose
- The Scraper Discovery workflow runs on a schedule, performs curated discovery, writes staging outputs, and opens a PR with candidate data changes.

2) Enabling automated PR creation
- The workflow prefers a repository secret `SCRAPER_BOT_TOKEN` containing a Personal Access Token (PAT) for a bot account.
- Required PAT scopes: `repo` (full control of private repositories) or at minimum `contents: write` and `pull_request: write`.
- To add the secret:
  1. Create a dedicated GitHub account for automation (recommended) and generate a PAT with the minimal required scopes.
 2. In the repository, go to Settings → Secrets and variables → Actions → New repository secret.
 3. Name the secret `SCRAPER_BOT_TOKEN` and paste the token value.

3) Fallback behavior
- If `SCRAPER_BOT_TOKEN` is not set, the workflow will push the branch but will not create a PR. Instead it creates a GitHub Issue that alerts maintainers and provides links to changed files.

4) Reviewing staged data
- Staging outputs are written to:
  - `data/companies-staging.json`
  - `data/offices-staging.json`
  - `data/scraper/collected-pages.json`
  - `data/scraper/proposed-accepts.json`
  - `data/scraper/top-proposals.json`

Review checklist:
- Inspect `data/scraper/top-proposals.json` for top candidates.
- Validate any manual edits with `npm run validate-data`.
- When ready, promote by applying proposals to canonical files (either via CLI or merging the automation PR).

5) Promoting staged data
- To promote selected staged records to canonical data:
  1. Ensure staging files are correct.
  2. Run `npm run validate-data` to verify schema and cross-reference checks.
  3. If valid, create a PR that updates `data/companies.json` and `data/offices.json` (the automation job can create this PR when `SCRAPER_BOT_TOKEN` is configured).

6) Troubleshooting
- If the workflow fails when attempting to create a PR, check repository or org settings that might block Actions from creating PRs. Use a PAT in `SCRAPER_BOT_TOKEN` if policy prevents the default token from creating PRs.
- If Lighthouse CI produces assertion failures, inspect `.lighthouseci/` artifact reports uploaded by the workflow. The workflow has been adjusted to not fail on LHCI assertion exits and will upload reports for manual review.

7) Security
- Use a dedicated automation account for the PAT and rotate the token periodically.
- Restrict who can update repository secrets.
