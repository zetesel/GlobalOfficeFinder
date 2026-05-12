import type { Office } from "../types";

/**
 * Offices the public site should list. Records without `approved` are treated as
 * published (legacy / hand-curated data). Scraper output is kept in
 * `data/scraper/review-queue.json` until promoted; rows in `offices.json` with
 * `"approved": false` are hidden from the public site and listed on the review-queue page.
 */
export function isPublishedOffice(office: Office): boolean {
  return office.approved !== false;
}

export function filterPublishedOffices(offices: Office[]): Office[] {
  return offices.filter(isPublishedOffice);
}
