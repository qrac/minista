import path from "node:path"
import fs from "fs-extra"
import beautify from "js-beautify"

import type { ResolvedConfig } from "../config/index.js"
import { logger } from "../cli/logger.js"
import { getSpace } from "../utility/space.js"

export type CreateAssets = {
  fileName: string
  data: string
}[]

export async function generateAssets({
  createAssets,
  config,
  maxNameLength,
}: {
  createAssets: CreateAssets
  config: ResolvedConfig
  maxNameLength?: number
}) {
  const { resolvedRoot } = config.sub
  const { useAssets, cssOptions, jsOptions } = config.main.beautify

  if (!createAssets.length) {
    return
  }
  await Promise.all(
    createAssets.map(async (item) => {
      const isCss = item.fileName.match(/.*\.css$/)
      const isJs = item.fileName.match(/.*\.js$/)

      let fileName = item.fileName
      let data: string | Buffer = item.data

      if (isCss && useAssets) {
        data = beautify.css(data, cssOptions)
      }
      if (isJs && useAssets) {
        data = beautify.js(data, jsOptions)
      }
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
