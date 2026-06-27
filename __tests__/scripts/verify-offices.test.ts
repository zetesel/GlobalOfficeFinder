/**
 * Unit tests for the pure decideVerdict helper exported from
 * scripts/scraper/verify-offices.mjs.
 *
 * No network calls are made here — this only exercises the threshold/clamping
 * logic that mirrors api/_lib/openrouter.ts verifyOffice behaviour.
 */
import { describe, it, expect } from "vitest";

// Vitest supports importing .mjs from TS tests when moduleResolution allows it.
// The function is exported as a named export from the .mjs file.
import { decideVerdict } from "../../scripts/scraper/verify-offices.mjs";

describe("decideVerdict (verify-offices.mjs)", () => {
  it("passes through a high-confidence approved verdict", () => {
    const result = decideVerdict({ verdict: "approved", reason: "Confirmed HQ", confidence: 0.9 });
    expect(result).not.toBeNull();
    expect(result!.verdict).toBe("approved");
    expect(result!.confidence).toBe(0.9);
    expect(result!.reason).toBe("Confirmed HQ");
  });

  it("passes through a rejected verdict unchanged", () => {
    const result = decideVerdict({ verdict: "rejected", reason: "No evidence", confidence: 0.8 });
    expect(result).not.toBeNull();
    expect(result!.verdict).toBe("rejected");
  });

  it("downgrades approved with confidence < 0.6 to rejected", () => {
    const result = decideVerdict({ verdict: "approved", reason: "maybe", confidence: 0.4 });
    expect(result).not.toBeNull();
    expect(result!.verdict).toBe("rejected");
    expect(result!.reason).toMatch(/low confidence/i);
    expect(result!.confidence).toBe(0.4);
  });

  it("treats an unknown verdict as rejected", () => {
    const result = decideVerdict({ verdict: "uncertain", reason: "dunno", confidence: 0.9 });
    expect(result).not.toBeNull();
    expect(result!.verdict).toBe("rejected");
  });

  it("clamps confidence > 1 to 1", () => {
    const result = decideVerdict({ verdict: "approved", reason: "ok", confidence: 2.5 });
    expect(result).not.toBeNull();
    expect(result!.confidence).toBe(1);
    // 1 >= 0.6 so still approved
    expect(result!.verdict).toBe("approved");
  });

  it("clamps confidence < 0 to 0", () => {
    const result = decideVerdict({ verdict: "rejected", reason: "bad", confidence: -0.5 });
    expect(result).not.toBeNull();
    expect(result!.confidence).toBe(0);
  });

  it("handles missing confidence (defaults to 0)", () => {
    const result = decideVerdict({ verdict: "approved", reason: "ok" });
    expect(result).not.toBeNull();
    // confidence 0 < 0.6 → downgraded to rejected
    expect(result!.verdict).toBe("rejected");
    expect(result!.confidence).toBe(0);
  });

  it("handles missing reason (defaults to empty string)", () => {
    const result = decideVerdict({ verdict: "rejected", confidence: 0.7 });
    expect(result).not.toBeNull();
    // reason should be a string (empty or the downgrade note)
    expect(typeof result!.reason).toBe("string");
  });

  it("returns null for null input", () => {
    expect(decideVerdict(null as unknown as Record<string, unknown>)).toBeNull();
  });

  it("returns null for non-object input", () => {
    expect(decideVerdict("garbage" as unknown as Record<string, unknown>)).toBeNull();
  });

  it("boundary: confidence exactly 0.6 passes through as approved", () => {
    const result = decideVerdict({ verdict: "approved", reason: "borderline", confidence: 0.6 });
    expect(result).not.toBeNull();
    // 0.6 is NOT < 0.6, so should stay approved
    expect(result!.verdict).toBe("approved");
  });
});
