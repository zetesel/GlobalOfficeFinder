import { describe, expect, it } from "vitest";
import { getApprovedLogo, getAllApprovedLogos, requiresAttribution } from "../../src/utils/companyLogos";

describe("companyLogos", () => {
  it("returns undefined when no approved logos registered", () => {
    expect(getApprovedLogo("google")).toBeUndefined();
    expect(getAllApprovedLogos()).toEqual([]);
  });

  it("detects attribution requirement for CC licenses", () => {
    expect(requiresAttribution("cc-by-4.0")).toBe(true);
    expect(requiresAttribution("brand-guidelines")).toBe(false);
  });
});
