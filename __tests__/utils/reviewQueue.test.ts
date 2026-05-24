import { describe, expect, it, vi } from "vitest";
import type { Office } from "../../src/types";
import {
  buildCompanyReviewSummaries,
  buildExportPayload,
  clearAllReviewState,
  countLocallyApprovedOffices,
  countOfficesAwaitingApproval,
  countRejectedOffices,
  getQueueItemDecision,
  matchesReviewFilter,
  matchesReviewSearch,
  queueItemStorageKey,
  type QueueFile,
  type QueueItem,
} from "../../src/utils/reviewQueue";

const sampleItem: QueueItem = {
  type: "office",
  sourceId: "test",
  sourceUrl: "https://example.com",
  office: {
    companyId: "google",
    country: "United States",
    countryCode: "US",
    region: "Americas",
    city: "NYC",
    address: "123 Main",
    postalCode: "10001",
  },
  reason: "test",
  confidence: "low",
  confidenceScore: 0,
  queuedAt: "2026-01-01T00:00:00.000Z",
};

const catalogOffice: Office = {
  id: "google-us-mtv",
  companyId: "google",
  country: "United States",
  countryCode: "US",
  region: "Americas",
  city: "Mountain View",
  address: "1600 Amphitheatre",
  postalCode: "94043",
  officeType: "Headquarters",
};

describe("queueItemStorageKey", () => {
  it("builds stable keys", () => {
    expect(queueItemStorageKey(sampleItem)).toContain("google");
    expect(queueItemStorageKey(sampleItem)).toContain("NYC");
  });
});

describe("buildCompanyReviewSummaries", () => {
  it("groups queue and catalog offices by company with unified pending counts", () => {
    const key = queueItemStorageKey(sampleItem);
    const summaries = buildCompanyReviewSummaries(
      [sampleItem],
      [catalogOffice],
      { [key]: "approved" },
      {},
    );
    expect(summaries).toHaveLength(1);
    expect(summaries[0].companyId).toBe("google");
    expect(summaries[0].approved).toBe(1);
    expect(summaries[0].pending).toBe(1);
    expect(summaries[0].catalogOffices).toHaveLength(1);
  });
});

describe("buildExportPayload", () => {
  it("includes catalog approvals and corrections", () => {
    const queue: QueueFile = {
      generatedAt: "2026-01-01",
      minPublishConfidence: "medium",
      items: [sampleItem],
    };
    const payload = buildExportPayload(queue, [sampleItem], ["google-us-mtv"], {
      [queueItemStorageKey(sampleItem)]: { city: "Brooklyn" },
    });
    expect(payload.approvedCatalogOfficeIds).toEqual(["google-us-mtv"]);
    expect(payload.corrections[queueItemStorageKey(sampleItem)]?.city).toBe("Brooklyn");
  });
});

describe("filters", () => {
  const summary = {
    companyId: "google",
    pending: 2,
    approved: 0,
    rejected: 0,
    queueItems: [],
    catalogOffices: [],
  };

  it("matches pending filter", () => {
    expect(matchesReviewFilter(summary, "pending")).toBe(true);
    expect(matchesReviewFilter({ ...summary, pending: 0 }, "pending")).toBe(false);
  });

  it("matches approved filter", () => {
    expect(matchesReviewFilter({ ...summary, approved: 1 }, "approved")).toBe(true);
    expect(matchesReviewFilter(summary, "approved")).toBe(false);
  });

  it("matches search by id and name", () => {
    expect(matchesReviewSearch(summary, "goog", { google: "Google" })).toBe(true);
    expect(matchesReviewSearch(summary, "microsoft", { google: "Google" })).toBe(false);
  });
});

describe("getQueueItemDecision", () => {
  it("reads decision from map", () => {
    const key = queueItemStorageKey(sampleItem);
    expect(getQueueItemDecision(sampleItem, { [key]: "rejected" })).toBe("rejected");
  });
});

describe("countOfficesAwaitingApproval", () => {
  it("counts pending queue items and unpublished catalog offices", () => {
    const key = queueItemStorageKey(sampleItem);
    const secondItem: QueueItem = {
      ...sampleItem,
      queuedAt: "2026-01-02T00:00:00.000Z",
      office: { ...sampleItem.office, city: "LA" },
    };
    expect(
      countOfficesAwaitingApproval([sampleItem, secondItem], [catalogOffice], {}, {}),
    ).toBe(3);
    expect(
      countOfficesAwaitingApproval(
        [sampleItem, secondItem],
        [catalogOffice],
        { [key]: "approved" },
        { [catalogOffice.id]: true },
      ),
    ).toBe(1);
  });
});

describe("countLocallyApprovedOffices", () => {
  it("counts approved queue items and catalog offices", () => {
    const key = queueItemStorageKey(sampleItem);
    expect(countLocallyApprovedOffices([], [], {}, {})).toBe(0);
    expect(
      countLocallyApprovedOffices(
        [sampleItem],
        [catalogOffice],
        { [key]: "approved" },
        { [catalogOffice.id]: true },
      ),
    ).toBe(2);
  });
});

describe("countRejectedOffices", () => {
  it("counts rejected queue items and catalog offices", () => {
    const key = queueItemStorageKey(sampleItem);
    expect(countRejectedOffices([], [], {}, {})).toBe(0);
    expect(
      countRejectedOffices(
        [sampleItem],
        [catalogOffice],
        { [key]: "rejected" },
        { [catalogOffice.id]: false },
      ),
    ).toBe(2);
  });
});

describe("clearAllReviewState", () => {
  it("removes review keys from localStorage", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    });

    store.set("goef-review-queue-decisions-v1", '{"k":"approved"}');
    store.set("goef-review-queue-corrections-v1", '{"k":{"city":"X"}}');
    store.set("goef-catalog-approvals-v1", '{"office-1":true}');

    clearAllReviewState();

    expect(store.has("goef-review-queue-decisions-v1")).toBe(false);
    expect(store.has("goef-review-queue-corrections-v1")).toBe(false);
    expect(store.has("goef-catalog-approvals-v1")).toBe(false);

    vi.unstubAllGlobals();
  });
});
