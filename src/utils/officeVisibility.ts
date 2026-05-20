import type { Office } from "../types";
import reviewQueue from "../../data/scraper/review-queue.json";

const QUEUE_DECISIONS_KEY = "goef-review-queue-decisions-v1";
type Decision = "approved" | "rejected";

interface QueueOffice {
  id?: string;
  companyId?: string;
  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  address?: string;
  postalCode?: string;
  officeType?: string;
  approved?: boolean;
}

interface QueueItem {
  type: string;
  sourceId: string;
  queuedAt: string;
  office: QueueOffice;
}

interface QueueFile {
  items: QueueItem[];
}

const queue = reviewQueue as QueueFile;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function isPublishedOffice(office: Office): boolean {
  return office.approved !== false;
}

export function filterPublishedOffices(offices: Office[]): Office[] {
  // 1) Get base approved offices from the catalog
  const publishedBase = offices.filter(isPublishedOffice);

  // 2) Get newly approved offices from the review queue (stored in localStorage)
  let extraOffices: Office[] = [];
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(QUEUE_DECISIONS_KEY) : null;
    if (raw) {
      const decisions = JSON.parse(raw);
      if (decisions && typeof decisions === "object" && !Array.isArray(decisions)) {
        const typedDecisions = decisions as Record<string, Decision | undefined>;
        const approvedItems = queue.items.filter((item) => {
          if (item.type !== "office") return false;
          const o = item.office;
          // Generate same storage key as ReviewQueuePage
          const key = [
            item.type,
            item.sourceId,
            item.queuedAt,
            String(o.companyId ?? ""),
            String(o.city ?? ""),
            String(o.address ?? "").slice(0, 120),
          ].join("::");
          return typedDecisions[key] === "approved";
        });

        const queueOffices: Office[] = [];
        for (const item of approvedItems) {
          const o = item.office;
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
            approved: true,
          });
        }
        extraOffices = queueOffices;
      }
    }
  } catch {
    // ignore parsing errors or SSR environment issues
  }

  // 3) Merge and deduplicate by companyId + city + address
  const seen = new Set(publishedBase.map((o) => `${o.companyId}::${o.city}::${o.address}`.toLowerCase()));
  const uniqueExtras = extraOffices.filter((o) => {
    const key = `${o.companyId}::${o.city}::${o.address}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return [...publishedBase, ...uniqueExtras];
}
