import { clearGeocodeCache } from "../utils/resolveOfficeCoordinates";
import { clearAllReviewState } from "../utils/reviewQueue";

/** Clear local review decisions, catalog approvals, corrections, and geocode cache. */
export function revokeAllLocalApprovals(): void {
  clearAllReviewState();
  clearGeocodeCache();
}
