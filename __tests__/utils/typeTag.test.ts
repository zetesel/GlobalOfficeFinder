import { describe, it, expect } from "vitest";
import { typeTag, REGION_ORDER, truncate } from "../../src/utils/typeTag";

describe("typeTag", () => {
  it("classifies headquarters as hq", () => {
    expect(typeTag("Headquarters")).toEqual({ short: "HQ", tone: "hq" });
    expect(typeTag("Co-Headquarters")).toEqual({ short: "HQ", tone: "hq" });
  });

  it("classifies regional offices", () => {
    expect(typeTag("Regional Office").tone).toBe("reg");
  });

  it("classifies engineering/R&D centers", () => {
    expect(typeTag("Engineering Center").tone).toBe("rnd");
    expect(typeTag("Research Lab").tone).toBe("rnd");
  });

  it("falls back to generic office tone", () => {
    expect(typeTag("Sales").tone).toBe("reg");
  });

  it("tolerates undefined input", () => {
    expect(typeTag(undefined).tone).toBe("reg");
  });

  it("exposes the canonical region order", () => {
    expect(REGION_ORDER).toContain("Americas");
    expect(REGION_ORDER).toContain("Europe");
    expect(REGION_ORDER.length).toBe(4);
  });
});

describe("truncate", () => {
  it("returns empty string for nullish input", () => {
    expect(truncate(undefined)).toBe("");
    expect(truncate(null)).toBe("");
    expect(truncate("")).toBe("");
  });

  it("returns full text when under the limit", () => {
    expect(truncate("Hello world", 50)).toBe("Hello world");
  });

  it("prefers the first sentence when it fits", () => {
    const text = "Acme makes things. They also sell widgets to enterprise customers.";
    expect(truncate(text, 40)).toBe("Acme makes things.");
  });

  it("falls back to word-boundary cut with ellipsis", () => {
    const text = "This is a long description without sentence punctuation that should be cut";
    const out = truncate(text, 30);
    expect(out.endsWith("…")).toBe(true);
    expect(out.length).toBeLessThanOrEqual(31);
    expect(out).not.toMatch(/\s$/);
  });
});
