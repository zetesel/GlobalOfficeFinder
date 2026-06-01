import { describe, it, expect } from "vitest";
import { slugify, deslugify } from "../../src/lib/slug";

describe("slugify", () => {
  it("lowercases and kebab-cases", () => {
    expect(slugify("Stripe Inc")).toBe("stripe-inc");
  });

  it("strips combining diacritics (NFKD-decomposable)", () => {
    expect(slugify("Café Société")).toBe("cafe-societe");
    expect(slugify("São Paulo")).toBe("sao-paulo");
  });

  it("collapses punctuation and trims dashes", () => {
    expect(slugify("  --A.B & C!!--  ")).toBe("a-b-c");
  });

  it("caps length at 80 chars", () => {
    const long = "a".repeat(200);
    expect(slugify(long).length).toBe(80);
  });

  it("handles empty / symbol-only input", () => {
    expect(slugify("")).toBe("");
    expect(slugify("***")).toBe("");
  });
});

describe("deslugify", () => {
  it("title-cases a slug back to a readable name", () => {
    expect(deslugify("acme-global-corp")).toBe("Acme Global Corp");
  });

  it("ignores stray dashes", () => {
    expect(deslugify("--stripe--")).toBe("Stripe");
  });
});
