/**
 * Centralised access to public environment values.
 *
 * Every `NEXT_PUBLIC_*` value the app reads should be surfaced here so the
 * parsing rules (defaults, boolean coercion) live in one place instead of
 * being re-implemented at each call site.
 */

/**
 * Parse a boolean-ish env value. Anything other than an explicit truthy
 * string is treated as `false`, so the default is always "off".
 */
function readBoolean(value: string | undefined): boolean {
  if (!value) return false;
  const normalised = value.trim().toLowerCase();
  return normalised === "1" || normalised === "true" || normalised === "yes" || normalised === "on";
}

/**
 * Opt-in flag for the development profiler overlay.
 *
 * Defaults to `false` so the overlay does not ship in every dev session;
 * contributors enable it by setting `NEXT_PUBLIC_PROFILER_OVERLAY=true`.
 */
export const PROFILER_OVERLAY_ENABLED = readBoolean(
  process.env.NEXT_PUBLIC_PROFILER_OVERLAY,
);
