import { useSyncExternalStore } from "react";
import reviewQueue from "../../data/scraper/review-queue.json";
import offices from "../../data/offices.json";
import type { Office } from "../types";
import { isPublishedOffice } from "../utils/officeVisibility";
import {
  countLocallyApprovedOffices,
  loadCatalogApprovals,
  loadDecisions,
  REVIEW_QUEUE_CHANGED_EVENT,
  type QueueFile,
} from "../utils/reviewQueue";

const queue = reviewQueue as QueueFile;
const heldBackCatalogOffices = (offices as Office[]).filter((o) => !isPublishedOffice(o));

function getCount(): number {
  return countLocallyApprovedOffices(
    queue.items,
    heldBackCatalogOffices,
    loadDecisions(),
    loadCatalogApprovals(),
  );
}

function subscribe(onStoreChange: () => void): () => void {
  const handler = () => onStoreChange();
  window.addEventListener("storage", handler);
  window.addEventListener(REVIEW_QUEUE_CHANGED_EVENT, handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(REVIEW_QUEUE_CHANGED_EVENT, handler);
  };
}

export function useLocallyApprovedCount(): number {
  return useSyncExternalStore(subscribe, getCount, getCount);
}
