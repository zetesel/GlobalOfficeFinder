import { describe, it, expect } from "vitest";
import { sanitizeUrl } from "../../src/utils/data";

describe("sanitizeUrl utility function", () => {
  it("returns undefined for undefined input", () => {
    expect(sanitizeUrl(undefined)).toBeUndefined();
  });

  it("returns undefined for empty string", () => {
    expect(sanitizeUrl("")).toBeUndefined();
  });

  it("sanitizes valid HTTPS URL", () => {
    const url = "https://example.com/path";
    expect(sanitizeUrl(url)).toBe(url);
  });

  it("sanitizes valid HTTP URL", () => {
    const url = "http://example.com/path";
    expect(sanitizeUrl(url)).toBe(url);
  });

  it("sanitizes URL with whitespace", () => {
    const url = "  https://example.com  ";
    expect(sanitizeUrl(url)).toBe("https://example.com/");
  });

  it("returns undefined for invalid protocol", () => {
    expect(sanitizeUrl("ftp://example.com")).toBeUndefined();
    expect(sanitizeUrl("javascript:alert('xss')")).toBeUndefined();
    expect(sanitizeUrl("file:///etc/passwd")).toBeUndefined();
  });

  it("returns undefined for malformed URL", () => {
    expect(sanitizeUrl("not a url")).toBeUndefined();
    expect(sanitizeUrl("example.com")).toBeUndefined();
  });

  it("preserves URL parameters and fragments", () => {
    const url = "https://example.com/path?query=value#fragment";
    expect(sanitizeUrl(url)).toBe(url);
  });

  it("handles URLs with ports", () => {
    const url = "https://example.com:8443/path";
    expect(sanitizeUrl(url)).toBe(url);
  });

  it("normalizes URLs correctly", () => {
    const url = "https://EXAMPLE.COM/Path";
    const sanitized = sanitizeUrl(url);
    expect(sanitized).toBeDefined();
    // URL normalization lowercases the domain
    expect(sanitized).toContain("example.com");
  });
});
