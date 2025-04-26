/** @typedef {import('../types').ImageOptimize} ImageOptimize */
/** @typedef {import('../types').ResolvedImageOptimize} ResolvedImageOptimize */

import { mergeObj } from "../../../shared/obj.js"

/**
 * @param {ImageOptimize["format"]} format
 * @param {string} ext
 * @returns {ResolvedImageOptimize["format"]}
 */
export function resolveFormat(format, ext) {
  return format === "inherit" ? ext : format
}

/**
 * @param {ImageOptimize["formatOptions"]} [formatOptions]
 * @param {ImageOptimize["quality"]} [quality]
 * @returns {ResolvedImageOptimize["formatOptions"]}
 */
export function resolveFormatOptions(formatOptions = {}, quality) {
  if (typeof quality !== "number") return formatOptions

  const sameQuality = {
    jpg: { quality },
    png: { quality },
    webp: { quality },
    avif: { quality },
  }
  return mergeObj(sameQuality, formatOptions)
}
