/** @typedef {import('../types').ResolvedImageOptimize} ResolvedImageOptimize */
/** @typedef {import('../types').ImageRecipe} ImageRecipe */
/** @typedef {import('../types').ImageView} ImageView */
/** @typedef {import('../types').ImagePattern} ImagePattern */

import path from "node:path"
import { normalizePath } from "vite"

import { generateHash } from "./hash.js"

/**
 * @param {string} fileName
 * @param {string} outName
 * @param {string} remoteName
 * @param {number} width
 * @param {number} height
 * @param {ResolvedImageOptimize["format"]} format
 * @returns {string}
 */
export function getPatternName(
  fileName,
  outName,
  remoteName,
  width,
  height,
  format,
) {
  const parsed = path.parse(fileName)

  let name = parsed.name
  let dir = normalizePath(parsed.dir)

  const remoteMatch = /^__r(\d+)$/.exec(name)
  name = remoteMatch ? remoteName.replace(/\[index\]/g, remoteMatch[1]) : name
  dir = remoteMatch ? "remote/" : dir === "." ? "" : dir + "/"

  const replaced = outName
    .replace(/\[name\]/g, name)
    .replace(/\[width\]/g, String(width))
    .replace(/\[height\]/g, String(height))
  return `${dir}${replaced}.${format}`
}

/**
 * @param {ResolvedImageOptimize} optimize
 * @param {ImageRecipe} recipe
 * @param {ImageView} view
 * @param {boolean} resizeOnly
 * @returns {{[patternHash: string]: ImagePattern}|{}}
 */
export function getPatternMap(optimize, recipe, view, resizeOnly) {
  /** @type {{[patternHash: string]: ImagePattern}} */
  let result = {}

  const {
    outName,
    remoteName,
    layout,
    breakpoints,
    resolutions,
    format,
    formatOptions,
    fit,
    position,
    background,
  } = optimize
  const resizeOptions = { fit, position, background }

  /** @type {number[]} */
  let items

  if (layout === "constrained") {
    items = breakpoints
  } else if (layout === "fixed") {
    items = resolutions
  } else {
    return result
  }

  const targets = resizeOnly ? [Math.max(...items)] : items

  for (const item of targets) {
    let width = 0
    let height = 0

    if (layout === "constrained") {
      width = item
      height = Math.round(item * view.ratioHeight)
    } else {
      width = Math.round(view.width * item)
      height = Math.round(view.height * item)
    }
    const fileName = getPatternName(
      recipe.fileName,
      outName,
      remoteName,
      width,
      height,
      format,
    )

    /** @type {ImagePattern} */
    const pattern = {
      fileName,
      width,
      height,
      format,
      formatOptions,
      resizeOptions,
    }
    const patternHash = generateHash(JSON.stringify(pattern))
    result[patternHash] = pattern
  }
  return result
}

/**
 * @param {ResolvedImageOptimize} optimize
 * @param {ImageRecipe} recipe
 * @param {ImageView} view
 * @param {boolean} resizeOnly
 * @returns {{ srcset: { [key: string]: string }, src: string }}
 */
export function getPatternAttrs(optimize, recipe, view, resizeOnly) {
  /** @type {{ srcset: { [key: string]: string }, src: string }} */
  let result = { srcset: {}, src: "" }

  const { outName, remoteName, layout, breakpoints, resolutions, format } =
    optimize

  /** @type {number[]} */
  let items
  /** @type {string} */
  let suffix

  if (layout === "constrained") {
    items = breakpoints
    suffix = "w"
  } else if (layout === "fixed") {
    items = resolutions
    suffix = "x"
  } else {
    return result
  }

  const targets = resizeOnly ? [Math.max(...items)] : items

  for (const item of targets) {
    let width = 0
    let height = 0

    if (layout === "constrained") {
      width = item
      height = Math.round(item * view.ratioHeight)
    } else {
      width = Math.round(view.width * item)
      height = Math.round(view.height * item)
    }
    const fileName = getPatternName(
      recipe.fileName,
      outName,
      remoteName,
      width,
      height,
      format,
    )

    if (!resizeOnly) {
      result.srcset[`${item}${suffix}`] = fileName
    }
    if (resizeOnly || item === Math.max(...items)) {
      result.src = fileName
    }
  }
  return result
}
