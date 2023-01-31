import path from "node:path"
import fs from "fs-extra"
import { parse as parseHtml } from "node-html-parser"
import beautify from "js-beautify"

import type { ResolvedConfig } from "../config/index.js"
import { logger } from "../cli/logger.js"
import { flags } from "../config/system.js"
import { transformEncode } from "../transform/encode.js"
import { getSpace } from "../utility/space.js"

export type CreatePages = {
  fileName: string
  data: string
}[]

export async function generatePages({
  createPages,
  config,
  hasBundleCss,
  maxNameLength,
}: {
  createPages: CreatePages
  config: ResolvedConfig
  hasBundleCss?: boolean
  maxNameLength?: number
}) {
  const { resolvedRoot } = config.sub
  const { partial } = config.main.assets
  const { useHtml, htmlOptions } = config.main.beautify

  if (!createPages.length) {
    return
  }
  await Promise.all(
    createPages.map(async (item) => {
      let fileName = item.fileName
      let data: string | Buffer = item.data
      let parsedHtml = parseHtml(data, { comment: true })

      const charsetEl = parsedHtml.querySelector(`meta[charset]`)
      const charset = charsetEl?.getAttribute("charset") || "UTF-8"

      const bundleEl = parsedHtml.querySelector(`link[${flags.bundle}]`)

      if (hasBundleCss) {
        bundleEl?.removeAttribute(flags.bundle)
      } else {
        bundleEl?.remove()
      }

      const partialAttr = `[data-${partial.rootAttrSuffix}]`
      const partialEl = parsedHtml.querySelector(partialAttr)
      const hydrateEl = parsedHtml.querySelector(`script[${flags.hydrate}]`)

      if (partialEl) {
        hydrateEl?.removeAttribute(flags.hydrate)
      } else {
        hydrateEl?.remove()
      }

      data = parsedHtml.toString()

      if (useHtml) {
        data = beautify.html(data, htmlOptions)
      }

      if (!charset.match(/^utf[\s-_]*8$/i)) {
        data = transformEncode(data, charset)
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
