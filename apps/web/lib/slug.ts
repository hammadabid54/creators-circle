// Slug helpers for creator profile URLs.
//
// We turn a creator's display name into a URL-safe, lowercase, hyphen-separated
// slug ("Sara Hassan" -> "sara-hassan"). Slugs are stored on the CreatorProfile
// and used as the public URL: /creators/<slug>.
//
// Slugs must be unique across the platform. `uniqueSlug` retries with a -2,
// -3, ... suffix if a collision is detected.

const MAX_BASE = 48;

export function slugify(name: string | null | undefined): string {
  if (!name) return '';
  // Normalize Unicode (handles accented characters, Urdu, etc.) and strip diacritics.
  const normalized = name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  return normalized
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_BASE);
}

export function fallbackSlug(id: string): string {
  // When a creator has no name we still want a stable URL.
  // Use the last 6 chars of the cuid (looks clean) as a deterministic fallback.
  return id ? `creator-${id.slice(-6)}` : 'creator';
}

/**
 * Returns a slug that is unique against the given set of existing slugs.
 * If the base collides, appends -2, -3, ... until free.
 */
export function uniqueSlug(base: string, existing: Set<string>): string {
  if (!base) base = 'creator';
  if (!existing.has(base)) return base;
  for (let i = 2; i < 1000; i++) {
    const candidate = `${base}-${i}`;
    if (!existing.has(candidate)) return candidate;
  }
  // Astronomically unlikely.
  return `${base}-${Date.now()}`;
}
