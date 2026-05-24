import type { Office } from "../types";

export type ReviewDecision = "approved" | "rejected";

export const REVIEW_QUEUE_CHANGED_EVENT = "review-queue-changed";

export const QUEUE_DECISIONS_KEY = "goef-review-queue-decisions-v1";
export const QUEUE_CORRECTIONS_KEY = "goef-review-queue-corrections-v1";
export const CATALOG_APPROVALS_KEY = "goef-catalog-approvals-v1";

export interface QueueOffice {
  id?: string;
  companyId?: string;
  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  address?: string;
  postalCode?: string;
  officeType?: string;
  contactUrl?: string;
  latitude?: number;
  longitude?: number;
}

export interface QueueItem {
  type: string;
  sourceId: string;
  sourceUrl: string;
  office: QueueOffice;
  reason: string;
  confidence: string;
  confidenceScore: number;
  queuedAt: string;
}

export interface QueueFile {
  generatedAt: string;
  minPublishConfidence: string;
  items: QueueItem[];
}

export interface OfficeCorrection {
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  region?: string;
  officeType?: string;
}

export interface CompanyReviewSummary {
  companyId: string;
  pending: number;
  approved: number;
  rejected: number;
  queueItems: QueueItem[];
  catalogOffices: Office[];
}

export function getCatalogOfficeDecision(
  catalogApprovals: Record<string, boolean | undefined>,
  officeId: string,
): ReviewDecision | undefined {
  const value = catalogApprovals[officeId];
  if (value === true) return "approved";
  if (value === false) return "rejected";
  return undefined;
}

export function getCompanyReviewCountries(summary: CompanyReviewSummary): string[] {
  const countries = new Set<string>();
  for (const item of summary.queueItems) {
    const country = item.office.country?.trim();
    if (country) countries.add(country);
  }
  for (const office of summary.catalogOffices) {
    const country = office.country?.trim();
    if (country) countries.add(country);
  }
  return [...countries].sort();
}

export function queueItemStorageKey(item: QueueItem): string {
  const o = item.office;
  return [
    item.type,
    item.sourceId,
    item.queuedAt,
    String(o.companyId ?? ""),
    String(o.city ?? ""),
    String(o.address ?? "").slice(0, 120),
  ].join("::");
}

export function loadJsonStorage<T extends Record<string, unknown>>(key: string): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {} as T;
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as T;
    }
  } catch {
    // ignore
  }
  return {} as T;
}

export function loadDecisions(): Record<string, ReviewDecision | undefined> {
  return loadJsonStorage<Record<string, ReviewDecision | undefined>>(QUEUE_DECISIONS_KEY);
}

export function loadCorrections(): Record<string, OfficeCorrection | undefined> {
  return loadJsonStorage<Record<string, OfficeCorrection | undefined>>(QUEUE_CORRECTIONS_KEY);
}

export function loadCatalogApprovals(): Record<string, boolean | undefined> {
  return loadJsonStorage<Record<string, boolean | undefined>>(CATALOG_APPROVALS_KEY);
}

export interface ReviewStateSnapshot {
  decisions: Record<string, ReviewDecision | undefined>;
  corrections: Record<string, OfficeCorrection | undefined>;
  catalogApprovals: Record<string, boolean | undefined>;
}

export function loadReviewStateSnapshot(): ReviewStateSnapshot {
  return {
    decisions: loadDecisions(),
    corrections: loadCorrections(),
    catalogApprovals: loadCatalogApprovals(),
  };
}

export function reviewStateSnapshotKey(state: ReviewStateSnapshot): string {
  return JSON.stringify(state);
}

export function getQueueItemDecision(
  item: QueueItem,
  decisions: Record<string, ReviewDecision | undefined>,
): ReviewDecision | undefined {
  return decisions[queueItemStorageKey(item)];
}

export function countOfficesAwaitingApproval(
  queueItems: QueueItem[],
  catalogOffices: Office[],
  decisions: Record<string, ReviewDecision | undefined>,
  catalogApprovals: Record<string, boolean | undefined>,
): number {
  const pendingQueue = queueItems.filter(
    (item) => item.type === "office" && !getQueueItemDecision(item, decisions),
  ).length;
  const pendingCatalog = catalogOffices.filter(
    (o) => getCatalogOfficeDecision(catalogApprovals, o.id) === undefined,
  ).length;
  return pendingQueue + pendingCatalog;
}

export function countRejectedOffices(
  queueItems: QueueItem[],
  catalogOffices: Office[],
  decisions: Record<string, ReviewDecision | undefined>,
  catalogApprovals: Record<string, boolean | undefined>,
): number {
  const rejectedQueue = queueItems.filter(
    (item) => item.type === "office" && getQueueItemDecision(item, decisions) === "rejected",
  ).length;
  const rejectedCatalog = catalogOffices.filter(
    (o) => getCatalogOfficeDecision(catalogApprovals, o.id) === "rejected",
  ).length;
  return rejectedQueue + rejectedCatalog;
}

export function countLocallyApprovedOffices(
  queueItems: QueueItem[],
  catalogOffices: Office[],
  decisions: Record<string, ReviewDecision | undefined>,
  catalogApprovals: Record<string, boolean | undefined>,
): number {
  const approvedQueue = queueItems.filter(
    (item) => item.type === "office" && getQueueItemDecision(item, decisions) === "approved",
  ).length;
  const approvedCatalog = catalogOffices.filter((o) => catalogApprovals[o.id] === true).length;
  return approvedQueue + approvedCatalog;
}

export function notifyReviewQueueChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(REVIEW_QUEUE_CHANGED_EVENT));
  }
}

export function clearAllReviewState(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(QUEUE_DECISIONS_KEY);
    localStorage.removeItem(QUEUE_CORRECTIONS_KEY);
    localStorage.removeItem(CATALOG_APPROVALS_KEY);
  } catch {
    // ignore
  }
  notifyReviewQueueChanged();
}

export function applyCorrectionToQueueOffice(
  office: QueueOffice,
  item: QueueItem,
  corrections: Record<string, OfficeCorrection | undefined>,
): QueueOffice {
  const correction = corrections[queueItemStorageKey(item)];
  if (!correction) return office;
  return { ...office, ...correction };
}

export function queueOfficeToPreviewOffice(
  item: QueueItem,
  corrections: Record<string, OfficeCorrection | undefined>,
): Office | null {
  const o = applyCorrectionToQueueOffice(item.office, item, corrections);
  if (
    !o.companyId?.trim() ||
    !o.country?.trim() ||
    !o.countryCode?.trim() ||
    !o.region?.trim() ||
    !o.city?.trim() ||
    !o.address?.trim() ||
    !o.postalCode?.trim()
  ) {
    return null;
  }
  const addressSlug = o.address
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 15);
  const generatedId = `queued-${o.companyId}-${o.city}-${addressSlug}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
  return {
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
  };
}

export function buildCompanyReviewSummaries(
  queueItems: QueueItem[],
  catalogOffices: Office[],
  decisions: Record<string, ReviewDecision | undefined>,
  catalogApprovals: Record<string, boolean | undefined>,
): CompanyReviewSummary[] {
  const byCompany = new Map<string, CompanyReviewSummary>();

  function ensure(companyId: string): CompanyReviewSummary {
    let summary = byCompany.get(companyId);
    if (!summary) {
      summary = {
        companyId,
        pending: 0,
        approved: 0,
        rejected: 0,
        queueItems: [],
        catalogOffices: [],
      };
      byCompany.set(companyId, summary);
    }
    return summary;
  }

  for (const item of queueItems) {
    if (item.type !== "office") continue;
    const companyId = item.office.companyId?.trim();
    if (!companyId) continue;
    const summary = ensure(companyId);
    summary.queueItems.push(item);
    const decision = getQueueItemDecision(item, decisions);
    if (decision === "approved") summary.approved += 1;
    else if (decision === "rejected") summary.rejected += 1;
    else summary.pending += 1;
  }

  for (const office of catalogOffices) {
    const summary = ensure(office.companyId);
    summary.catalogOffices.push(office);
    const decision = getCatalogOfficeDecision(catalogApprovals, office.id);
    if (decision === "approved") summary.approved += 1;
    else if (decision === "rejected") summary.rejected += 1;
    else summary.pending += 1;
  }

  return [...byCompany.values()].sort((a, b) => {
    if (b.pending !== a.pending) return b.pending - a.pending;
    const aTotal = a.queueItems.length + a.catalogOffices.length;
    const bTotal = b.queueItems.length + b.catalogOffices.length;
    if (bTotal !== aTotal) return bTotal - aTotal;
    return a.companyId.localeCompare(b.companyId);
  });
}

export interface ReviewExportPayload {
  generatedAt: string;
  reviewedAt: string;
  minPublishConfidence: string;
  approvedItems: QueueItem[];
  approvedCatalogOfficeIds: string[];
  corrections: Record<string, OfficeCorrection>;
}

export function buildExportPayload(
  queue: QueueFile,
  approvedItems: QueueItem[],
  approvedCatalogOfficeIds: string[],
  corrections: Record<string, OfficeCorrection | undefined>,
): ReviewExportPayload {
  const activeCorrections: Record<string, OfficeCorrection> = {};
  for (const [key, value] of Object.entries(corrections)) {
    if (value && Object.keys(value).length > 0) activeCorrections[key] = value;
  }
  return {
    generatedAt: queue.generatedAt,
    reviewedAt: new Date().toISOString(),
    minPublishConfidence: queue.minPublishConfidence,
    approvedItems,
    approvedCatalogOfficeIds,
    corrections: activeCorrections,
  };
}

export type ReviewFilter = "all" | "pending" | "approved";

export function matchesReviewFilter(
  summary: CompanyReviewSummary,
  filter: ReviewFilter,
): boolean {
  if (filter === "pending") return summary.pending > 0;
  if (filter === "approved") return summary.approved > 0;
  return true;
}

export function matchesReviewSearch(
  summary: CompanyReviewSummary,
  query: string,
  companyNameById: Record<string, string>,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const name = companyNameById[summary.companyId]?.toLowerCase() ?? "";
  return summary.companyId.toLowerCase().includes(q) || name.includes(q);
}
