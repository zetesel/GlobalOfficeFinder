export function sanitizeUrl(
  url: string | undefined | null,
): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.href;
    }
  } catch {
    // invalid URL
  }
  return undefined;
}
