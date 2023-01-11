import path from "node:path"
import fs from "fs-extra"
import fg from "fast-glob"

import type { ResolvedConfig } from "../config/index.js"
import type { CreateIcons } from "../transform/icon.js"
import { transformSprite } from "../transform/sprite.js"
import { generateMessage } from "./message.js"
import { getSpace } from "../utility/space.js"

export async function generateTempIcon({
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

export async function generateIcon({
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

export async function generateIcons({
  createIcons,
  config,
  maxNameLength,
}: {
  createIcons: CreateIcons
  config: ResolvedConfig
  maxNameLength?: number
}) {
  const createIconsArray = Object.entries(createIcons)

  if (createIconsArray.length) {
    await Promise.all(
      createIconsArray.map(async (item) => {
        const fileName = item[0]
        const createData = item[1]
        const { srcDir } = createData

        return await generateIcon({ fileName, srcDir, config, maxNameLength })
      })
    )
  }
}
