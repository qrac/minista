/** @typedef {import('../types').CustomHtmlAttributes} CustomHtmlAttributes */
/** @typedef {import('../types').CustomBodyAttributes} CustomBodyAttributes */

/**
 * @param {CustomHtmlAttributes | CustomBodyAttributes} attrs
 * @returns {string}
 */
export function headAttrsToStr(attrs) {
  return Object.entries(attrs)
    .filter(([_, value]) => value !== undefined)
    .map(([key, value]) => `${key}="${String(value)}"`)
    .join(" ")
}
