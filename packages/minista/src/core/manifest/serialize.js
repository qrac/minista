// @ts-check

/**
 * @param {unknown} value
 * @returns {unknown}
 */
function sortJson(value) {
  if (Array.isArray(value)) return value.map(sortJson)
  if (!value || typeof value !== "object") return value
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, sortJson(item)]),
  )
}

/** @param {import("./types.js").ProjectManifest} manifest */
export function serializeProjectManifest(manifest) {
  return `${JSON.stringify(sortJson(manifest), null, 2)}\n`
}
