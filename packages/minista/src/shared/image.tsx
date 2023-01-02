import type { ImageOptimize, ImagesOptimize } from "../config/image.js"

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

const autoSize = "__minista_image_auto_size"

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
  decoding = "async",
  loading = "lazy",
  remoteName,
  layout,
  breakpoints,
  resolution,
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
    remoteName,
    layout,
    breakpoints,
    resolution,
    format,
    formatOptions,
    quality,
    aspect: aspect ? resolveAspect(aspect) : undefined,
    background,
    fit,
    position,
  }
  const optimizeStr = JSON.stringify(optimizeObj)

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
      data-minista-transform-target="image"
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
  decoding = "async",
  loading = "lazy",
  remoteName,
  layout,
  breakpoints,
  resolution,
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
    remoteName,
    layout,
    breakpoints,
    resolution,
    format,
    formatOptions,
    quality,
    aspect: resolvedAspect,
    background,
    fit,
    position,
  }
  const optimizeStr = JSON.stringify(optimizeObj)

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
              remoteName: item.remoteName || remoteName,
              layout: item.layout || layout,
              breakpoints: item.breakpoints || breakpoints,
              resolution: item.resolution || resolution,
              format: itemFormat,
              formatOptions: item.formatOptions || formatOptions,
              quality: item.quality || quality,
              aspect: resolvedSourceAspect || resolvedAspect,
              background: item.background || background,
              fit: item.fit || fit,
              position: item.position || position,
            }
            const sourceOptimizeStr = JSON.stringify(sourceOptimizeObj)

            return (
              <source
                key={`${index}-${formatIndex}`}
                media={item.media}
                srcSet=""
                sizes={sourceSizes}
                width={sourceWidth}
                height={sourceHeight}
                data-minista-transform-target="image"
                data-minista-image-src={src}
                data-minista-image-optimize={sourceOptimizeStr}
              />
            )
          })
        } else {
          const sourceOptimizeObj: Partial<ImageOptimize> = {
            remoteName: item.remoteName || remoteName,
            layout: item.layout || layout,
            breakpoints: item.breakpoints || breakpoints,
            resolution: item.resolution || resolution,
            format: undefined,
            formatOptions: item.formatOptions || formatOptions,
            quality: item.quality || quality,
            aspect: resolvedSourceAspect || resolvedAspect,
            background: item.background || background,
            fit: item.fit || fit,
            position: item.position || position,
          }
          const sourceOptimizeStr = JSON.stringify(sourceOptimizeObj)

          return (
            <source
              key={index}
              media={item.media}
              srcSet=""
              sizes={sourceSizes}
              width={sourceWidth}
              height={sourceHeight}
              data-minista-transform-target="image"
              data-minista-image-src={src}
              data-minista-image-optimize={sourceOptimizeStr}
            />
          )
        }
      })}

      {otherFormats.map((item, index) => {
        const sourceOptimizeObj: Partial<ImageOptimize> = {
          remoteName,
          layout,
          breakpoints,
          resolution,
          format: item,
          formatOptions,
          quality,
          aspect: resolvedAspect,
          background,
          fit,
          position,
        }
        const sourceOptimizeStr = JSON.stringify(sourceOptimizeObj)

        return (
          <source
            key={index}
            srcSet=""
            sizes={sizes}
            width={width}
            height={height}
            data-minista-transform-target="image"
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
        data-minista-transform-target="image"
        data-minista-image-src={src}
        data-minista-image-optimize={optimizeStr}
        {...attributes}
      />
    </picture>
  )
}

function test() {
  return (
    <>
      <Image src="/test.png" />
    </>
  )
}
