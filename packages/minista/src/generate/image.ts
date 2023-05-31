import type { ResizeOptions } from "sharp"
import path from "node:path"
import fs from "fs-extra"
import sharp from "sharp"

import type { ResolvedConfig } from "../config/index.js"
import type {
  ResolvedImageOptimize,
  ResolvedImageFormat,
} from "../config/image.js"
import { logger } from "../cli/logger.js"
import { getSpace } from "../utility/space.js"

export type EntryImages = {
  [src: string]: {
    fileName: string
    width: number
    height: number
    aspectWidth: number
    aspectHeight: number
  }
}

export type CreateImages = {
  [fileName: string]: CreateImage
}
type CreateImage = {
  input: string
  width: number
  height: number
  resizeOptions: ResizeOptions
  format: ResolvedImageFormat
  formatOptions: ResolvedImageOptimize["formatOptions"]
}

export async function generateImageCache(fileName: string, data: EntryImages) {
  if (Object.keys(data).length === 0) {
    return
  }
  await fs.outputJson(fileName, data, { spaces: 2 }).catch((err) => {
    console.error(err)
  })
}

export async function generateTempImage({
  fileName,
  filePath,
  createImage,
}: {
  fileName: string
  filePath: string
  createImage: CreateImage
}) {
  const { input, width, height, resizeOptions } = createImage
  const image = sharp(input)
  image.resize(width, height, resizeOptions)

  const data = await image.toBuffer()

  await fs
    .outputFile(fileName, data)
    .then(() => {
      logger({ label: "BUILD", main: filePath })
    })
    .catch((err) => {
      console.error(err)
    })
}

export async function generateImages({
  createImages,
  config,
  maxNameLength,
}: {
  createImages: CreateImages
  config: ResolvedConfig
  maxNameLength?: number
}) {
  const { resolvedRoot } = config.sub
  const createArray = Object.entries(createImages)

  if (!createArray.length) {
    return
  }
  await Promise.all(
    createArray.map(async (item) => {
      const fileName = item[0]
      const createImage = item[1]
      const { input, width, height, resizeOptions } = createImage
      const { format, formatOptions } = createImage

      const image = sharp(input)
      image.resize(width, height, resizeOptions)

      switch (format) {
        case "jpg":
          image.jpeg({ ...formatOptions?.jpg })
          break
        case "png":
          image.png({ ...formatOptions?.png })
          break
        case "webp":
          image.webp({ ...formatOptions?.webp })
          break
        case "avif":
          image.avif({ ...formatOptions?.avif })
          break
      }
      const data = await image.toBuffer()
      const space = getSpace({
        nameLength: fileName.length,
        maxNameLength,
        min: 3,
      })
      const routePath = path.join(resolvedRoot, config.main.out, fileName)
      const relativePath = path.relative(process.cwd(), routePath)

      await fs
        .outputFile(routePath, data)
        .then(() => {
          logger({ label: "BUILD", main: relativePath, space, data })
        })
        .catch((err) => {
          console.error(err)
        })
      return
    })
  )
}
