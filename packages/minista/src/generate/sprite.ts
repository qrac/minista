import path from "node:path"
import fs from "fs-extra"
import fg from "fast-glob"

import type { ResolvedConfig } from "../config/index.js"
import { logger } from "../cli/logger.js"
import { transformSprite } from "../transform/sprite.js"
import { getSpace } from "../utility/space.js"

export type CreateSprites = {
  [srcDir: string]: string
}

export async function generateTempSprite({
  srcDir,
  fileName,
  config,
}: {
  srcDir: string
  fileName: string
  config: ResolvedConfig
}) {
  const { resolvedRoot } = config.sub
  const options = config.main.assets.icons.svgstoreOptions
  const filePath = fileName.replace(resolvedRoot, "")
  const svgFiles = await fg(path.join(srcDir, "**/*.svg"))

  if (!svgFiles.length) {
    return
  }
  const data = transformSprite({
    svgFiles,
    options,
  })
  await fs
    .outputFile(fileName, data)
    .then(() => {
      logger({ label: "BUILD", main: filePath })
    })
    .catch((err) => {
      console.error(err)
    })
}

export async function generateSprites({
  createSprites,
  config,
  maxNameLength,
}: {
  createSprites: CreateSprites
  config: ResolvedConfig
  maxNameLength?: number
}) {
  const { resolvedRoot } = config.sub
  const options = config.main.assets.icons.svgstoreOptions
  const createArray = Object.entries(createSprites)

  if (!createArray.length) {
    return
  }
  await Promise.all(
    createArray.map(async (item) => {
      const srcDir = item[0]
      const fileName = item[1]
      const svgFiles = await fg(path.join(srcDir, "**/*.svg"))

      if (!svgFiles.length) {
        return
      }
      const data = transformSprite({ svgFiles, options })
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
