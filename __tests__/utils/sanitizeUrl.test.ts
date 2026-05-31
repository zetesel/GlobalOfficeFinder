import { describe, it, expect } from "vitest";
import { sanitizeUrl } from "../../src/utils/sanitizeUrl";

describe("sanitizeUrl", () => {
  it("returns undefined for empty/nullish input", () => {
    expect(sanitizeUrl(undefined)).toBeUndefined();
    expect(sanitizeUrl("")).toBeUndefined();
    expect(sanitizeUrl(null)).toBeUndefined();
  });

  it("accepts http and https URLs", () => {
    expect(sanitizeUrl("https://example.com")).toBe("https://example.com/");
    expect(sanitizeUrl("http://example.com/path")).toBe("http://example.com/path");
  });

  it("rejects javascript: and other dangerous schemes", () => {
    expect(sanitizeUrl("javascript:alert(1)")).toBeUndefined();
    expect(sanitizeUrl("data:text/html,<script>alert(1)</script>")).toBeUndefined();
    expect(sanitizeUrl("file:///etc/passwd")).toBeUndefined();
  });

  it("rejects garbage", () => {
    expect(sanitizeUrl("not a url")).toBeUndefined();
  });
});
