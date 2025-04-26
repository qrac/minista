/** @typedef {import('../types').ResolvedImageOptimize} ResolvedImageOptimize */
/** @typedef {import('../types').ImageEntry} ImageEntry */
/** @typedef {import('../types').ImageView} ImageView */
/** @typedef {import('../types').ImageCreate} ImageCreate */

import path from "node:path"

import { generateHash } from "./hash.js"

/**
 * @param {ResolvedImageOptimize} resolvedOptimize
 * @param {ImageEntry} imageEntry
 * @param {ImageView} imageView
 * @param {{useSizeName: boolean; resizeOnly: boolean}} options
 * @returns {{[createHash: string]: ImageCreate}|{}}
 */
export function getImageCreateMap(
  resolvedOptimize,
  imageEntry,
  imageView,
  options
) {
  let result = {}

  const name = path.parse(imageEntry.fileName).name
  const {
    layout,
    breakpoints,
    resolutions,
    format,
    formatOptions,
    background,
    fit,
    position,
  } = resolvedOptimize
  const resizeOptions = { background, fit, position }
  const { useSizeName, resizeOnly } = options

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
      height = Math.round(item * imageView.ratioHeight)
    } else {
      width = Math.round(imageView.width * item)
      height = Math.round(imageView.height * item)
    }
    const sizeName = useSizeName ? `-${width}x${height}` : ""
    const fileName = `${name}${sizeName}.${format}`

    /** @type {ImageCreate} */
    const imageCreate = {
      output: fileName,
      width,
      height,
      format,
      formatOptions,
      resizeOptions,
    }
    const createHash = generateHash(JSON.stringify(imageCreate))
    result[createHash] = imageCreate
  }
  return result
}

/**
 * @param {ResolvedImageOptimize} resolvedOptimize
 * @param {ImageEntry} imageEntry
 * @param {ImageView} imageView
 * @param {{useSizeName:boolean;resizeOnly:boolean}} options
 * @returns {{ srcset: { [key: string]: string }, src: string }}
 */
export function getImageCreatedAttrs(
  resolvedOptimize,
  imageEntry,
  imageView,
  options
) {
  let result = { srcset: {}, src: "" }

  const name = path.parse(imageEntry.fileName).name
  const { layout, breakpoints, resolutions, format } = resolvedOptimize
  const { useSizeName, resizeOnly } = options

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
      height = Math.round(item * imageView.ratioHeight)
    } else {
      width = Math.round(imageView.width * item)
      height = Math.round(imageView.height * item)
    }
    const sizeName = useSizeName ? `-${width}x${height}` : ""
    const fileName = `${name}${sizeName}.${format}`

    if (!resizeOnly) {
      result.srcset[`${item}${suffix}`] = fileName
    }
    if (resizeOnly || item === Math.max(...items)) {
      result.src = fileName
    }
  }
  return result
}
