/**
 * Assert that `i18n/messages/es.json` has exactly the same key set as `en.json`.
 *
 * A missing key makes Spanish users see English fallbacks; an extra key is dead
 * text that no translator will ever see. Translations do not have to be complete,
 * only present: this checks key parity, not translation quality.
 *
 *     node scripts/check-i18n-keys.mjs
 *
 * Keys are compared as dotted paths (`Shell.tabs.dashboard`). Leaf values are
 * strings or arrays; anything else under an object is recursed into.
 */

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * @param {unknown} node
 * @param {string} [prefix]
 * @returns {string[]} sorted dotted leaf paths
 */
export function flattenKeys(node, prefix = "") {
  if (node === null || typeof node !== "object" || Array.isArray(node)) {
    return prefix ? [prefix] : [];
  }
  return Object.entries(node).flatMap(([key, value]) =>
    flattenKeys(value, prefix ? `${prefix}.${key}` : key)
  );
}

/**
 * @param {string[]} enKeys
 * @param {string[]} esKeys
 * @returns {{missing: string[], extra: string[]}} missing from es, extra in es
 */
export function diffKeys(enKeys, esKeys) {
  const en = new Set(enKeys);
  const es = new Set(esKeys);
  return {
    missing: enKeys.filter((key) => !es.has(key)).sort(),
    extra: esKeys.filter((key) => !en.has(key)).sort(),
  };
}

function main() {
  const load = (locale) =>
    flattenKeys(JSON.parse(readFileSync(join(REPO_ROOT, "i18n/messages", `${locale}.json`), "utf8")));
  const { missing, extra } = diffKeys(load("en"), load("es"));

  if (missing.length === 0 && extra.length === 0) {
    console.log("i18n keys OK — es.json has the same keys as en.json.");
    return;
  }

  const lines = [
    ...missing.map((key) => `- missing in es.json: ${key}`),
    ...extra.map((key) => `- extra in es.json (not in en.json): ${key}`),
  ];
  console.error(
    [
      `i18n key check FAILED — ${missing.length} missing, ${extra.length} extra.`,
      "Add or remove these keys in i18n/messages/es.json so it matches en.json.",
      "",
      ...lines,
    ].join("\n")
  );
  process.exit(1);
}

if (process.argv[1]?.endsWith("check-i18n-keys.mjs")) {
  try {
    main();
  } catch (error) {
    console.error(`i18n key check failed:\n  ${error?.message ?? error}`);
    process.exit(1);
  }
}
