import type { Office } from "../types";
import reviewQueue from "../../data/scraper/review-queue.json";

const QUEUE_DECISIONS_KEY = "goef-review-queue-decisions-v1";

export function isPublishedOffice(office: Office): boolean {
  return office.approved === true;
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
      if (decisions && typeof decisions === "object") {
        const approvedItems = reviewQueue.items.filter((item: any) => {
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
          return decisions[key] === "approved";
        });

        extraOffices = approvedItems.map((item: any) => {
          const o = item.office;
          const addressSlug = String(o.address || "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .slice(0, 15);
          const generatedId = `queued-${o.companyId}-${o.city}-${addressSlug}`
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-");

          return {
            officeType: "Office",
            ...o,
            approved: true,
            id: o.id || generatedId,
          };
        });
      }
    }
  } catch (e) {
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
