/** @typedef {import('../types').ImageOptimize} ImageOptimize */
/** @typedef {import('../types').ResolvedImageOptimize} ResolvedImageOptimize */
/** @typedef {import('../types').ImageEntry} ImageEntry */

import path from "node:path"

import { resolveBreakpoints } from "./breakpoints.js"
import { resolveFormat, resolveFormatOptions } from "./format.js"

/**
 * @param {ImageOptimize} optimize
 * @param {ImageEntry} imageEntry
 * @returns {ResolvedImageOptimize}
 */
export function resolveOptimize(optimize, imageEntry) {
  const { fileName, width } = imageEntry
  const ext = path.extname(fileName).replace(/^\./, "")
  return {
    ...optimize,
    breakpoints: resolveBreakpoints(optimize.breakpoints, width),
    format: resolveFormat(optimize.format, ext),
    formatOptions: resolveFormatOptions(
      optimize.formatOptions,
      optimize.quality
    ),
  }
}
