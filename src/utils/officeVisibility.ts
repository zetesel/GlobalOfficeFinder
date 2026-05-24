import type { Office } from "../types";
import reviewQueue from "../../data/scraper/review-queue.json";
import {
  applyCorrectionToQueueOffice,
  CATALOG_APPROVALS_KEY,
  loadCatalogApprovals,
  loadCorrections,
  loadDecisions,
  queueItemStorageKey,
  QUEUE_CORRECTIONS_KEY,
  QUEUE_DECISIONS_KEY,
  type OfficeCorrection,
  type QueueFile,
  type ReviewDecision,
} from "./reviewQueue";
import { enrichOfficeWithCoordinates } from "./resolveOfficeCoordinates";

const queue = reviewQueue as QueueFile;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function readStorage<T>(key: string): T | null {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(key) : null;
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as T;
    }
  } catch {
    // ignore
  }
  return null;
}

export function isPublishedOffice(office: Office): boolean {
  return office.approved === true;
}

export function filterPublishedOffices(offices: Office[]): Office[] {
  const publishedBase = offices.filter(isPublishedOffice);

  let extraOffices: Office[] = [];
  let catalogApproved: Office[] = [];

  try {
    const decisions =
      readStorage<Record<string, ReviewDecision | undefined>>(QUEUE_DECISIONS_KEY) ??
      loadDecisions();
    const corrections =
      readStorage<Record<string, OfficeCorrection | undefined>>(QUEUE_CORRECTIONS_KEY) ??
      loadCorrections();
    const catalogApprovalMap =
      readStorage<Record<string, boolean | undefined>>(CATALOG_APPROVALS_KEY) ??
      loadCatalogApprovals();

    catalogApproved = offices.filter(
      (o) => !isPublishedOffice(o) && catalogApprovalMap[o.id] === true,
    );

    const approvedItems = queue.items.filter((item) => {
      if (item.type !== "office") return false;
      return decisions[queueItemStorageKey(item)] === "approved";
    });

    const queueOffices: Office[] = [];
    for (const item of approvedItems) {
      const o = applyCorrectionToQueueOffice(item.office, item, corrections);
      if (
        !isNonEmptyString(o.companyId) ||
        !isNonEmptyString(o.country) ||
        !isNonEmptyString(o.countryCode) ||
        !isNonEmptyString(o.region) ||
        !isNonEmptyString(o.city) ||
        !isNonEmptyString(o.address) ||
        !isNonEmptyString(o.postalCode)
      ) {
        continue;
      }
      const addressSlug = String(o.address || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .slice(0, 15);
      const generatedId = `queued-${o.companyId}-${o.city}-${addressSlug}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-");

      queueOffices.push({
        id: o.id || generatedId,
        companyId: o.companyId,
        country: o.country,
        countryCode: o.countryCode,
        region: o.region,
        city: o.city,
        address: o.address,
        postalCode: o.postalCode,
        officeType: o.officeType || "Office",
        latitude: o.latitude,
        longitude: o.longitude,
        contactUrl: o.contactUrl,
        approved: true,
      });
    }
    extraOffices = queueOffices;
  } catch {
    // ignore parsing errors or SSR environment issues
  }

  const catalogPublished = catalogApproved.map((o) => ({ ...o, approved: true as const }));

  const seen = new Set(
    publishedBase.map((o) => `${o.companyId}::${o.city}::${o.address}`.toLowerCase()),
  );

  const mergeUnique = (list: Office[]) =>
    list.filter((o) => {
      const key = `${o.companyId}::${o.city}::${o.address}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  const merged = [
    ...publishedBase,
    ...mergeUnique(catalogPublished),
    ...mergeUnique(extraOffices),
  ];
  return merged.map((office) => enrichOfficeWithCoordinates(office) as Office);
}
