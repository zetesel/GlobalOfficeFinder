import { useSyncExternalStore } from "react";
import offices from "../../data/offices.json";
import type { Office } from "../types";
import { filterPublishedOffices } from "../utils/officeVisibility";
import {
  CATALOG_APPROVALS_KEY,
  QUEUE_CORRECTIONS_KEY,
  QUEUE_DECISIONS_KEY,
  REVIEW_QUEUE_CHANGED_EVENT,
} from "../utils/reviewQueue";

const catalogOffices = offices as Office[];

let cachedStorageKey = "";
let cachedPublishedOffices: Office[] = [];

function readStorageSnapshotKey(): string {
  if (typeof window === "undefined") return "";
  return [
    localStorage.getItem(QUEUE_DECISIONS_KEY) ?? "",
    localStorage.getItem(QUEUE_CORRECTIONS_KEY) ?? "",
    localStorage.getItem(CATALOG_APPROVALS_KEY) ?? "",
  ].join("\u0000");
}

function invalidatePublishedOfficesCache(): void {
  cachedStorageKey = "";
}

function getPublishedOffices(): Office[] {
  const storageKey = readStorageSnapshotKey();
  if (storageKey === cachedStorageKey) {
    return cachedPublishedOffices;
  }

  cachedStorageKey = storageKey;
  cachedPublishedOffices = filterPublishedOffices(catalogOffices);
  return cachedPublishedOffices;
}

function subscribe(onStoreChange: () => void): () => void {
  const handler = () => {
    invalidatePublishedOfficesCache();
    onStoreChange();
  };
  window.addEventListener("storage", handler);
  window.addEventListener(REVIEW_QUEUE_CHANGED_EVENT, handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(REVIEW_QUEUE_CHANGED_EVENT, handler);
  };
}

export function usePublishedOffices(): Office[] {
  return useSyncExternalStore(subscribe, getPublishedOffices, getPublishedOffices);
}
