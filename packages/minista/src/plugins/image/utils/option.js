/** @typedef {import('../types.js').ImageOptimize} ImageOptimize */
/** @typedef {import('../types.js').ResolvedImageOptimize} ResolvedImageOptimize */
/** @typedef {import('../types.js').ImageRecipe} ImageRecipe */

import path from "node:path"

import { resolveBreakpoints } from "./breakpoints.js"
import { resolveFormat, resolveFormatOptions } from "./format.js"

/**
 * @param {ImageOptimize} optimize
 * @param {ImageRecipe} recipe
 * @returns {ResolvedImageOptimize}
 */
export function resolveOptimizeOption(optimize, recipe) {
  const { fileName, width } = recipe
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
