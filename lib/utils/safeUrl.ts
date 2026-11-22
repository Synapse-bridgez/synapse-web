/**
 * Safe URL rendering helpers.
 *
 * Chain-supplied data (callback URLs, arbitrary string fields) and user-entered
 * data (address-book labels, etc.) are attacker-influenceable input in this
 * app's threat model. React escapes rendered text by default, but any value
 * placed into an `href` (or similar URL-bearing attribute) is NOT escaped and
 * can reintroduce XSS via `javascript:`, `data:`, `vbscript:`, etc.
 *
 * Always route chain-derived or user-entered URLs through these helpers before
 * rendering them as a clickable link.
 */

/** Schemes that are safe to render as a clickable `href`. */
const SAFE_URL_SCHEMES = ['http:', 'https:'];

/**
 * Returns true when `value` is a URL whose scheme is `http` or `https`.
 *
 * Rejects `javascript:`, `data:`, `vbscript:`, `file:`, and any other scheme,
 * as well as malformed input. Relative URLs are rejected because chain-supplied
 * values must be absolute and explicitly http(s).
 */
export function isSafeHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return false;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return false;
  }

  // Lowercase explicitly so the allowlist never depends on parser normalization.
  return SAFE_URL_SCHEMES.includes(parsed.protocol.toLowerCase());
}

/**
 * Returns a URL safe to use in an `href` (or `undefined` when unsafe).
 *
 * Callers should render the value as plain text when this returns `undefined`
 * rather than as a clickable link.
 */
export function toSafeHttpUrl(value: unknown): string | undefined {
  if (!isSafeHttpUrl(value)) {
    return undefined;
  }

  return value.trim();
}

/**
 * Returns a display string for a URL that is safe to render as text.
 *
 * Unsafe values are returned as-is so they remain visible to the user (React
 * escapes text content), but they must never be passed to `href`.
 */
export function toSafeUrlLabel(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}
