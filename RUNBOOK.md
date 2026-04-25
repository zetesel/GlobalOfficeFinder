# GlobalOfficeFinder Operational Runbook

This runbook provides procedures for maintaining, updating, and troubleshooting GlobalOfficeFinder in production.

## Table of Contents

- [Monitoring](#monitoring)
- [Updating Data](#updating-data)
- [Secrets Management](#secrets-management)
- [Incident Response](#incident-response)
- [Backup & Recovery](#backup--recovery)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

## Monitoring

### Uptime Monitoring

The site is hosted on GitHub Pages with built-in uptime:
- **URL**: https://zetesel.github.io/GlobalOfficeFinder/
- **Monitoring**: GitHub Pages infrastructure monitoring
- **SLA**: Best effort (GitHub Pages SLA applies)

### Performance Monitoring

Performance metrics are captured during CI/CD:
- **Lighthouse Reports**: Generated in `e2e-tests.yml` workflow
- **Artifacts**: Available in GitHub Actions
- **Thresholds**:
  - Performance: ≥80
  - Accessibility: ≥90
  - Best Practices: ≥90
  - SEO: ≥90

### Error Tracking

Currently using GitHub Actions for build/test failure notifications:
- Failed workflows: Notify maintainers
- Test failures: Block PR merge
- Build failures: Prevent deployment

**Future Enhancement**: Integrate Sentry for client-side error tracking.

### Health Checks

Monitor these endpoints:
- **Root**: https://zetesel.github.io/GlobalOfficeFinder/ (should return 200)
- **Company Page**: https://zetesel.github.io/GlobalOfficeFinder/company/google (should return 200)
- **Country Page**: https://zetesel.github.io/GlobalOfficeFinder/country/US (should return 200)

## Updating Data

### Adding a New Company

**Process:**
1. Create issue using [Add/Update Company template](../.github/ISSUE_TEMPLATE/add-company.yml)
2. Provide company and office information
3. Maintainer reviews for accuracy and completeness
4. Contributor creates PR with data changes
5. Automated validation passes
6. Manual review approves
7. PR merged to `main`
8. Site auto-deploys

**Timeline**: 
- Simple updates: 1-3 days
- Multiple offices: 3-5 days
- Requires verification: 5-7 days

### Direct Data Edits

For maintainers with direct access:

1. **Create branch**:
   ```bash
   git checkout -b data/update-companies
   ```

2. **Edit files**:
   - Edit `data/companies.json` for company info
   - Edit `data/offices.json` for office locations

3. **Validate locally**:
   ```bash
   npm install
   npm run validate-data
   ```

4. **Test locally**:
   ```bash
   npm run dev
   # Test changes in browser
   npm run build
   ```

5. **Commit and push**:
   ```bash
   git add data/
   git commit -m "data: update company information"
   git push origin data/update-companies
   ```

6. **Create PR**: Open PR and ensure CI passes

7. **Merge**: Merge to `main` when ready

### Bulk Data Updates

For importing large datasets:

1. **Validate externally**:
   ```bash
   node scripts/validate-data.mjs < large-dataset.json
   ```

2. **Create migration script** (if needed):
   ```bash
   # Example: scripts/migrate-data.mjs
   node scripts/migrate-data.mjs < old-format.json > new-format.json
   ```

3. **Review for PII**: Ensure no sensitive data

4. **Test in branch**:
   ```bash
   npm run validate-data
   npm run test
   npm run build
   ```

5. **Merge and deploy**: Standard PR process

## Secrets Management

### Current Secrets

Currently, this project uses minimal secrets:
- ✅ No API keys committed
- ✅ No credentials in code
- ✅ GitHub Secrets used only for CI/CD

**Stored in GitHub Secrets**:
- None currently (all tokens generated at runtime)

### Adding New Secrets

If secrets are needed in future phases:

1. **Create secret in GitHub**:
   - Go to: Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `SECRET_NAME` (UPPERCASE)
   - Value: Secret value

2. **Use in workflows**:
   ```yaml
   - name: Use secret
     env:
      MY_SECRET: ${{ secrets.SECRET_NAME }}
     run: echo "Secret available as $MY_SECRET"
   ```

3. **Never**:
   - Log secrets to console
   - Commit secrets to git
   - Share secrets in PRs
   - Use secrets in client-side code

### Rotating Secrets

**Process** (if secrets are added):

1. Generate new secret
2. Add to GitHub Secrets with new version: `SECRET_NAME_V2`
3. Update workflows to use new secret
4. Test new secret works
5. Remove old secret: `SECRET_NAME`
6. Document rotation in audit log

**Timeline**: 1 day for most rotations

### Audit Trail

Current audit mechanism:
- All commits logged in git history
- GitHub Actions logs retained for 90 days
- Dependabot update history available
- Branch protection logs available

## Incident Response

### Severity Levels

| Level | Impact | Response Time | Example |
|-------|--------|---------------|---------|
| **Critical** | Site down, data loss | Immediate | GitHub Pages down, deployment failed |
| **High** | Feature broken, data invalid | 1-4 hours | CSP blocking app, validation errors |
| **Medium** | Feature partially broken | 1 day | Map not loading, search slow |
| **Low** | Minor issue, cosmetic | 1 week | Typo, layout issue |

### Critical Incident Response

**If site is down or data is corrupted:**

1. **Immediate actions** (within 30 minutes):
   ```bash
   # Check GitHub Pages status
   gh repo view --web  # Open repo in browser
   
   # Verify last deployment
   gh workflow list
   gh run list --workflow=deploy.yml --limit=5
   ```

2. **Identify root cause**:
   - Check latest commit: `git log -1`
   - Check latest deployment: GitHub Actions → deploy workflow
   - Check data validation: Look for CI failures
   - Check tests: Did build/test pass?

3. **Rollback if needed**:
   ```bash
   # Revert last commit if it caused issue
   git revert HEAD --no-edit
   git push origin main
   ```

4. **Communicate**:
   - Post incident in [Discussions](../../discussions)
   - Include timeline, impact, resolution
   - Link to any related issues

### High Incident Response

**For feature breakage or data issues:**

1. **Investigate** (1 hour):
   - Reproduce issue
   - Check recent changes
   - Review error logs

2. **Triage** (30 min):
   - Is it a code issue or data issue?
   - Can it wait for next release?
   - Does it affect multiple users?

3. **Fix** (2-4 hours):
   - Create hotfix branch
   - Fix and test
   - Create PR with urgency
   - Expedited review/merge

4. **Verify** (30 min):
   - Check site after deployment
   - Monitor for 30 minutes

### Security Incident Response

**For potential security issues:**

1. **Do NOT create public issues**

2. **Report privately**:
   - Use [Security Advisories](../../security/advisories)
   - Or email maintainers

3. **Response timeline**:
   - Acknowledge: Within 24 hours
   - Investigate: 24-48 hours
   - Fix: Within 1 week
   - Disclose: After fix deployed

4. **Communication**:
   - Affected users notified
   - Security advisory published
   - Kudos to reporter (if desired)

## Backup & Recovery

### Current Backup Strategy

Data is backed up automatically by:

1. **Git Repository**:
   - All data committed to git
   - Replicated on GitHub servers
   - Can be cloned/forked by users

2. **GitHub Pages**:
   - Builds stored automatically
   - Can be rolled back via git history

3. **Build Artifacts**:
   - Stored for 90 days in GitHub Actions
   - E2E reports and Lighthouse results available

### Recovery Procedures

**To recover deleted data:**

```bash
# View deleted data in git history
git log --all --full-history -- data/companies.json

# Restore deleted data
git checkout <commit-hash>^ data/companies.json
git commit -m "restore: recover deleted data"
git push origin main
```

**To roll back to previous deployment:**

```bash
# View deployment history
gh workflow view deploy.yml

# Revert to previous version
git revert <commit-hash>
git push origin main
# Site will auto-deploy
```

## Deployment

### Automatic Deployment

Current deployment is fully automated:

**Trigger**: Push to `main` branch

**Process**:
1. CI runs: validate-data, lint, test, build
2. If all pass: Create artifact
3. Deploy to GitHub Pages
4. Site live in ~30 seconds

**Monitoring**:
- Check [Actions tab](../../actions)
- Look for green checkmark next to commit
- Verify site loads at https://zetesel.github.io/GlobalOfficeFinder/

### Manual Deployment (if needed)

```bash
# Trigger deployment manually
gh workflow run deploy.yml
```

### Deployment Checklist

Before merging to `main`:

- [ ] All tests passing
- [ ] Data validates successfully
- [ ] Code review approved
- [ ] No breaking changes
- [ ] Documentation updated
- [ ] Changelog updated (if applicable)

## Troubleshooting

### Site Not Loading

**Symptoms**: 404, 500, timeout

**Checklist**:
1. Check GitHub status: https://www.githubstatus.com/
2. Check [Actions](../../actions) for failed deployment
3. Check [last commit](../../commits/main) for recent changes
4. Try cache clear: `Ctrl+Shift+R` or `Cmd+Shift+R`

**Fix**:
- If deployment failed, check error logs in Actions
- If code issue, revert last commit and re-push

### Data Not Validating

**Error**: `data validation failed`

**Solution**:
```bash
npm run validate-data 2>&1 | head -50
```

Common issues:
- Missing required fields
- Invalid JSON syntax
- Duplicate entries
- Invalid URLs

### Search Not Working

**Symptoms**: No results, wrong results

**Checklist**:
1. Check that data loads: Open browser console
2. Check search logic: Review `useCompanySearch` hook
3. Check for JavaScript errors: Browser console

**Fix**:
- Clear browser cache
- Reload page
- Check latest data in file

### Map Not Showing

**Symptoms**: Blank map area, map errors

**Checklist**:
1. Check OpenStreetMap tile server: https://tile.openstreetmap.org/
2. Check Leaflet loaded: Browser console
3. Check for CORS errors: Browser console

**Fix**:
- Refresh page
- Check CSP isn't blocking tiles
- Verify coordinates are valid

### Build Failing Locally

**Error**: `npm run build` fails

**Solutions**:
```bash
# Clear cache
rm -rf dist node_modules package-lock.json
npm install

# Check TypeScript
npm run build -- --listFiles

# Check linting
npm run lint

# Validate data
npm run validate-data
```

## Regular Maintenance

### Daily
- Monitor GitHub [Actions](../../actions) for failures
- Check if site loads: https://zetesel.github.io/GlobalOfficeFinder/

### Weekly
- Review [Issues](../../issues) for new contributions
- Check [Discussions](../../discussions) for questions
- Review dependency updates from Dependabot

### Monthly
- Review [Lighthouse reports](../../actions/workflows/e2e-tests.yml)
- Check npm audit for vulnerabilities: `npm audit`
- Review test coverage
- Plan data updates

### Quarterly
- Review security practices
- Check for abandoned issues
- Plan feature releases
- Update documentation

## Escalation

### For Data Issues
1. Check CONTRIBUTING.md
2. Post in [Discussions](../../discussions)
3. Create issue if needed
4. Contact maintainers: GitHub mentions

### For Code Issues
1. Check README troubleshooting section
2. Search [Issues](../../issues) for similar reports
3. Create issue with details
4. Contact maintainers

### For Security Issues
1. Use [Security Advisories](../../security/advisories)
2. Never post publicly
3. Include reproduction steps
4. Wait for response (24-48 hours)

## Contact

**Maintainers**: See [repository page](../../) for contact info

**For urgent issues**: Create issue with `urgent` label
