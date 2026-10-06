// @ts-check

/**
 * project root相対のPOSIX pathへ正規化する。
 *
 * @param {string} input
 * @returns {import("../types.js").ProjectPath}
 */
export function toProjectPath(input) {
  const normalized = input
    .replaceAll("\\", "/")
    .replace(/^\.\//, "")
    .replace(/^\/+/, "")
    .replace(/\/{2,}/g, "/")
  if (!normalized || normalized === ".")
    return /** @type {import("../types.js").ProjectPath} */ (".")
  const segments = normalized.split("/")
  if (segments.includes("..")) {
    throw new TypeError(`Project path must not escape the root: ${input}`)
  }
  return /** @type {import("../types.js").ProjectPath} */ (normalized)
}
