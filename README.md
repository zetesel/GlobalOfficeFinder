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
