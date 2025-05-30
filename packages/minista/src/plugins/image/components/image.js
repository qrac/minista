/** @typedef {import('../types').ImageProps} ImageProps */

import { createElement } from "react"

import { resolveAspect } from "../utils/aspect.js"
import { cleanObj, mergeObj } from "../../../shared/obj.js"

const defaultDecoding = "async"
const defaultLoading = "eager"
const defaultOptimize = {}

const AUTO_SIZE = "__minista_image_auto_size"

/**
 * @param {ImageProps} props
 * @returns {React.ReactElement}
 */
export function Image({
  src,
  sizes = AUTO_SIZE,
  width = AUTO_SIZE,
  height = AUTO_SIZE,
  alt = "",
  decoding = defaultDecoding,
  loading = defaultLoading,
  outName,
  remoteName,
  layout,
  breakpoints,
  resolutions,
  format,
  formatOptions,
  quality,
  aspect,
  background,
  fit,
  position,
  ...attributes
}) {
  const optimizeObjRaw = {
    outName,
    remoteName,
    layout,
    breakpoints,
    resolutions,
    format,
    formatOptions,
    quality,
    aspect: aspect ? resolveAspect(aspect) : undefined,
    background,
    fit,
    position,
  }
  const optimizeObj = cleanObj(optimizeObjRaw)
  const optimizeStr = JSON.stringify(mergeObj(defaultOptimize, optimizeObj))
  return createElement("img", {
    srcSet: "",
    src: null,
    sizes,
    width,
    height,
    alt,
    decoding,
    loading,
    "data-minista-image": "",
    "data-minista-image-src": src,
    "data-minista-image-optimize": optimizeStr,
    ...attributes,
  })
}
