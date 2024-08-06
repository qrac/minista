import type { ImageOptimize, ImagesOptimize } from "../@types/client.js"
import { deepmergeCustom } from "deepmerge-ts"

type ImageProps = {
  src: string
  sizes?: string
  width?: number | string
  height?: number | string
  alt?: string
  decoding?: HTMLImageElement["decoding"]
  loading?: HTMLImageElement["loading"]
} & Partial<ImageOptimize> &
  React.HTMLAttributes<HTMLImageElement>

type PictureProps = {
  src: string
  sizes?: string
  width?: number | string
  height?: number | string
  alt?: string
  decoding?: HTMLImageElement["decoding"]
  loading?: HTMLImageElement["loading"]
  artDirectives?: ArtDirective[]
} & Partial<ImagesOptimize> &
  React.HTMLAttributes<HTMLImageElement>

type ArtDirective = {
  media: string
  src: string
  sizes?: string
  width?: number | string
  height?: number | string
} & Partial<ImagesOptimize>

const defaultDecoding = "async"
const defaultLoading = "lazy"
const defaultOptimize = {}
const autoSize = "__minista_image_auto_size"

const customDeepmerge = deepmergeCustom({
  mergeArrays: false,
})

function resolveAspect(aspect: string) {
  const regex = /^\d+\.?\d*:\d+\.?\d*$/
  const isAspect = regex.test(aspect)

  if (isAspect) {
    return aspect
  }
}

export function Image({
  src,
  sizes = autoSize,
  width = autoSize,
  height = autoSize,
  alt = "",
  decoding = defaultDecoding,
  loading = defaultLoading,
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
}: ImageProps) {
  const optimizeObj: Partial<ImageOptimize> = {
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
  const optimizeStr = JSON.stringify(
    customDeepmerge(defaultOptimize, optimizeObj)
  )

  return (
    <img
      srcSet=""
      src=""
      sizes={sizes}
      width={width}
      height={height}
      alt={alt}
      decoding={decoding}
      loading={loading}
      data-minista-image=""
      data-minista-image-src={src}
      data-minista-image-optimize={optimizeStr}
      {...attributes}
    />
  )
}

export function Picture({
  src,
  sizes = autoSize,
  width = autoSize,
  height = autoSize,
  alt = "",
  decoding = defaultDecoding,
  loading = defaultLoading,
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
}: PictureProps) {
  const format = formats?.at(-1)
  const otherFormats =
    formats && formats.length >= 2
      ? formats.filter((item) => item !== format)
      : []
  const resolvedAspect = aspect ? resolveAspect(aspect) : undefined

  const optimizeObj: Partial<ImageOptimize> = {
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
  const optimizeStr = JSON.stringify(
    customDeepmerge(defaultOptimize, optimizeObj)
  )

  return (
    <picture>
      {artDirectives?.map((item, index) => {
        const sourceSizes = item.sizes || autoSize
        const sourceWidth = item.width || autoSize
        const sourceHeight = item.height || autoSize

        const resolvedSourceAspect = item.aspect
          ? resolveAspect(item.aspect)
          : undefined

        if (item.formats && item.formats.length > 0) {
          return item.formats.map((itemFormat, formatIndex) => {
            const sourceOptimizeObj: Partial<ImageOptimize> = {
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
            const sourceOptimizeStr = JSON.stringify(
              customDeepmerge(defaultOptimize, sourceOptimizeObj)
            )

            return (
              <source
                key={`${index}-${formatIndex}`}
                media={item.media}
                srcSet=""
                sizes={sourceSizes}
                width={sourceWidth}
                height={sourceHeight}
                data-minista-image=""
                data-minista-image-src={src}
                data-minista-image-optimize={sourceOptimizeStr}
              />
            )
          })
        } else {
          const sourceOptimizeObj: Partial<ImageOptimize> = {
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
          const sourceOptimizeStr = JSON.stringify(
            customDeepmerge(defaultOptimize, sourceOptimizeObj)
          )

          return (
            <source
              key={index}
              media={item.media}
              srcSet=""
              sizes={sourceSizes}
              width={sourceWidth}
              height={sourceHeight}
              data-minista-image=""
              data-minista-image-src={src}
              data-minista-image-optimize={sourceOptimizeStr}
            />
          )
        }
      })}

      {otherFormats.map((item, index) => {
        const sourceOptimizeObj: Partial<ImageOptimize> = {
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
        const sourceOptimizeStr = JSON.stringify(
          customDeepmerge(defaultOptimize, sourceOptimizeObj)
        )

        return (
          <source
            key={index}
            srcSet=""
            sizes={sizes}
            width={width}
            height={height}
            data-minista-image=""
            data-minista-image-src={src}
            data-minista-image-optimize={sourceOptimizeStr}
          />
        )
      })}

      <img
        srcSet=""
        src=""
        sizes={sizes}
        width={width}
        height={height}
        alt={alt}
        decoding={decoding}
        loading={loading}
        data-minista-image=""
        data-minista-image-src={src}
        data-minista-image-optimize={optimizeStr}
        {...attributes}
      />
    </picture>
  )
}
