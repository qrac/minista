import path from "node:path"
import fs from "fs-extra"
import fg from "fast-glob"

import type { ResolvedConfig } from "../config/index.js"
import { transformSprite } from "../transform/sprite.js"
import { generateMessage } from "./message.js"
import { getSpace } from "../utility/space.js"

export type CreateSprites = {
  [key: string]: CreateSprite
}
type CreateSprite = {
  srcDir: string
}

export async function generateTempSprite({
  fileName,
  srcDir,
  config,
}: {
  fileName: string
  srcDir: string
  config: ResolvedConfig
}) {
  const { assets } = config.main
  const options = assets.icons.svgstoreOptions
  const svgFiles = await fg(path.join(srcDir, "**/*.svg"))

  if (!svgFiles.length) {
    return ""
  }
  const data = transformSprite({
    svgFiles,
    options,
  })
  await fs.outputFile(fileName, data).catch((err) => {
    console.error(err)
  })
}

async function generateSprite({
  fileName,
  srcDir,
  config,
  maxNameLength,
}: {
  fileName: string
  srcDir: string
  config: ResolvedConfig
  maxNameLength?: number
}) {
  const { resolvedRoot } = config.sub
  const { assets } = config.main
  const options = assets.icons.svgstoreOptions
  const svgFiles = await fg(path.join(srcDir, "**/*.svg"))

  if (!svgFiles.length) {
    return
  }
  const data = transformSprite({ svgFiles, options })
  const space = getSpace({ nameLength: fileName.length, maxNameLength, min: 3 })
  const routePath = path.join(resolvedRoot, config.main.out, fileName)
  const relativePath = path.relative(process.cwd(), routePath)

  return await fs
    .outputFile(routePath, data)
    .then(() => {
      generateMessage({ fileName: relativePath, space, data })
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
  const createSpritesArray = Object.entries(createSprites)

  if (createSpritesArray.length) {
    await Promise.all(
      createSpritesArray.map(async (item) => {
        const fileName = item[0]
        const createData = item[1]
        const { srcDir } = createData
        return await generateSprite({ fileName, srcDir, config, maxNameLength })
      })
    )
  }
}
