/** @typedef {import('../types').ResolvedImageOptimize} ResolvedImageOptimize */
/** @typedef {import('../types').ImageRecipe} ImageRecipe */
/** @typedef {import('../types').ImageView} ImageView */

import { getRatio } from "./ratio.js"

const AUTO_SIZE = "__minista_image_auto_size"

/**
 * @param {ResolvedImageOptimize} resolvedOptimize
 * @param {ImageRecipe} recipe
 * @param {{ sizes: string, width: string, height: string }} elAttrs
 * @returns {ImageView}
 */
export function getView(resolvedOptimize, recipe, elAttrs) {
  const floor2 = (/** @type {number} */ num) => Math.floor(num * 100) / 100
  const { layout, breakpoints, aspect } = resolvedOptimize

  let sizes = elAttrs.sizes
  let width = Number(elAttrs.width) || 0
  let height = Number(elAttrs.height) || 0
  let ratioWidth = recipe.ratioWidth
  let ratioHeight = recipe.ratioHeight

  const isAutoSizes = sizes === AUTO_SIZE
  const isAutoWidth = elAttrs.width === AUTO_SIZE
  const isAutoHeight = elAttrs.height === AUTO_SIZE

  if (aspect) {
    const [, w = "1", h = "1"] = aspect.match(/^(\d+\.?\d*):(\d+\.?\d*)$/) || []
    const aw = Number(w) || 1
    const ah = Number(h) || 1
    ratioWidth = getRatio(aw, ah)
    ratioHeight = getRatio(ah, aw)
  }

  if (isAutoWidth && isAutoHeight) {
    width = recipe.width
    height = recipe.height
  } else if (isAutoWidth) {
    width = Math.round(height * ratioWidth)
  } else if (isAutoHeight) {
    height = Math.round(width * ratioHeight)
  }

  if (!aspect) {
    ratioWidth = getRatio(width, height)
    ratioHeight = getRatio(height, width)
  }

  const changeAspect =
    floor2(ratioWidth) !== floor2(recipe.ratioWidth) ||
    floor2(ratioHeight) !== floor2(recipe.ratioHeight)

  if (isAutoSizes) {
    const maxBp = Math.max(...(breakpoints || [width]))
    if (layout === "constrained") {
      sizes = `(min-width: ${maxBp}px) ${maxBp}px, 100vw`
    } else if (layout === "fixed") {
      sizes = `(min-width: ${width}px) ${width}px, 100vw`
    }
  }
  return { sizes, width, height, ratioWidth, ratioHeight, changeAspect }
}
