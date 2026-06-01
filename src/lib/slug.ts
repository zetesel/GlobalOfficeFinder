/**
 * Turn a free-text company name into a URL-safe slug.
 * Lowercase, kebab-case, diacritics normalised, capped at 80 chars.
 * Mirrors the slugify used by the build-time scraper so URLs stay consistent.
 */
export function slugify(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip combining diacritics
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Best-effort human-readable name from a slug (fallback when no rawQuery). */
export function deslugify(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
