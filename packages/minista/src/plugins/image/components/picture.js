/** @typedef {import('../types').PictureProps} PictureProps */

import { createElement } from "react"

import { resolveAspect } from "../utils/aspect.js"
import { cleanObj, mergeObj } from "../../../shared/obj.js"

const defaultDecoding = "async"
const defaultLoading = "eager"
const defaultOptimize = {}

const AUTO_SIZE = "__minista_image_auto_size"

/**
 * @param {PictureProps} props
 * @returns {React.ReactElement}
 */
export function Picture({
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
  formats,
  formatOptions,
  quality,
  aspect,
  background,
  fit,
  position,
  artDirectives,
  ...attributes
}) {
  const format = formats?.at(-1)
  const otherFormats =
    formats && formats.length >= 2
      ? formats.filter((item) => item !== format)
      : []
  const resolvedAspect = aspect ? resolveAspect(aspect) : undefined

  const optimizeObjRaw = {
    outName,
    remoteName,
    layout,
    breakpoints,
    resolutions,
    format,
    formatOptions,
    quality,
    aspect: resolvedAspect,
    background,
    fit,
    position,
  }
  const optimizeObj = cleanObj(optimizeObjRaw)
  const optimizeStr = JSON.stringify(mergeObj(defaultOptimize, optimizeObj))

  return createElement(
    "picture",
    null,
    artDirectives?.map((item, index) => {
      const sourceSizes = item.sizes || AUTO_SIZE
      const sourceWidth = item.width || AUTO_SIZE
      const sourceHeight = item.height || AUTO_SIZE
      const resolvedSourceAspect = item.aspect
        ? resolveAspect(item.aspect)
        : undefined

      if (item.formats && item.formats.length > 0) {
        return item.formats.map((itemFormat, formatIndex) => {
          const sourceOptimizeObjRaw = {
            outName: item.outName || outName,
            remoteName: item.remoteName || remoteName,
            layout: item.layout || layout,
            breakpoints: item.breakpoints || breakpoints,
            resolutions: item.resolutions || resolutions,
            format: itemFormat,
            formatOptions: item.formatOptions || formatOptions,
            quality: item.quality || quality,
            aspect: resolvedSourceAspect || resolvedAspect,
            background: item.background || background,
            fit: item.fit || fit,
            position: item.position || position,
          }
          const sourceOptimizeObj = cleanObj(sourceOptimizeObjRaw)
          const sourceOptimizeStr = JSON.stringify(
            mergeObj(defaultOptimize, sourceOptimizeObj),
          )

          return createElement("source", {
            key: `${index}-${formatIndex}`,
            media: item.media,
            srcSet: "",
            sizes: sourceSizes,
            width: sourceWidth,
            height: sourceHeight,
            "data-minista-image": "",
            "data-minista-image-src": item.src,
            "data-minista-image-optimize": sourceOptimizeStr,
          })
        })
      } else {
        const sourceOptimizeObjRaw = {
          outName: item.outName || outName,
          remoteName: item.remoteName || remoteName,
          layout: item.layout || layout,
          breakpoints: item.breakpoints || breakpoints,
          resolutions: item.resolutions || resolutions,
          format: undefined,
          formatOptions: item.formatOptions || formatOptions,
          quality: item.quality || quality,
          aspect: resolvedSourceAspect || resolvedAspect,
          background: item.background || background,
          fit: item.fit || fit,
          position: item.position || position,
        }
        const sourceOptimizeObj = cleanObj(sourceOptimizeObjRaw)
        const sourceOptimizeStr = JSON.stringify(
          mergeObj(defaultOptimize, sourceOptimizeObj),
        )

        return createElement("source", {
          key: index,
          media: item.media,
          srcSet: "",
          sizes: sourceSizes,
          width: sourceWidth,
          height: sourceHeight,
          "data-minista-image": "",
          "data-minista-image-src": item.src,
          "data-minista-image-optimize": sourceOptimizeStr,
        })
      }
    }),
    otherFormats.map((item, index) => {
      const sourceOptimizeObjRaw = {
        outName,
        remoteName,
        layout,
        breakpoints,
        resolutions,
        format: item,
        formatOptions,
        quality,
        aspect: resolvedAspect,
        background,
        fit,
        position,
      }
      const sourceOptimizeObj = cleanObj(sourceOptimizeObjRaw)
      const sourceOptimizeStr = JSON.stringify(
        mergeObj(defaultOptimize, sourceOptimizeObj),
      )

      return createElement("source", {
        key: index,
        srcSet: "",
        sizes,
        width,
        height,
        "data-minista-image": "",
        "data-minista-image-src": src,
        "data-minista-image-optimize": sourceOptimizeStr,
      })
    }),
    createElement("img", {
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
    }),
  )
}
