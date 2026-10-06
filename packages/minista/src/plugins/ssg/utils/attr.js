/**
 * @param {Record<string, unknown>} attrs
 * @returns {string}
 */
export function headAttrsToStr(attrs) {
  return Object.entries(attrs)
    .filter(([_, value]) => value !== undefined)
    .map(([key, value]) => `${key}="${String(value)}"`)
    .join(" ")
}
