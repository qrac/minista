/**
 * @param {Record<string, string | number | boolean | null | undefined>} attrs
 * @returns {string}
 */
export function getAttrsStr(attrs) {
  return Object.entries(attrs)
    .filter(([_, value]) => value !== undefined)
    .map(([key, value]) => `${key}="${String(value)}"`)
    .join(" ")
}
