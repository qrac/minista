import sharp from "sharp"

/**
 * @param {string} input
 * @param {import('../types').ImageCreate} imageCreate
 * @returns {Promise<Buffer>}
 */
export async function runSharp(input, imageCreate) {
  const { width, height, format, formatOptions, resizeOptions } = imageCreate

  try {
    let pipeline = sharp(input).resize(width, height, resizeOptions).rotate()
    switch (format) {
      case "jpg":
        pipeline = pipeline.jpeg(formatOptions?.jpg)
        break
      case "png":
        pipeline = pipeline.png(formatOptions?.png)
        break
      case "webp":
        pipeline = pipeline.webp(formatOptions?.webp)
        break
      case "avif":
        pipeline = pipeline.avif(formatOptions?.avif)
        break
      default:
        // @ts-ignore
        pipeline = pipeline.toFormat(format, formatOptions?.[format])
    }
    return await pipeline.withMetadata().toBuffer()
  } catch (err) {
    console.error("runSharp error:", err)
    throw err
  }
}
