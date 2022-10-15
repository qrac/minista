import path from "node:path"
import fs from "fs-extra"
import pc from "picocolors"
import beautify from "js-beautify"

import type { ResolvedConfig } from "../config/index.js"
import type { BuildResult } from "../cli/build.js"
import type { GatherPages } from "../gather/pages.js"

export async function generatePages({
  config,
  items,
  hasBundle,
}: {
  config: ResolvedConfig
  items: BuildResult["output"]
  hasBundle: boolean
}) {
  let hasPages = false
  let gatherPagesPath = ""

  await Promise.all(
    items.map(async (item) => {
      const isGatherJs = item.fileName.match(/__minista_gather_pages\.js$/)

      if (!isGatherJs) {
        return
      }
      let fileName = item.fileName
      fileName = "pages.mjs"

      let data = ""
      item.source && (data = item.source)
      item.code && (data = item.code)

      if (!data) {
        return
      }
      data = `import { fetch } from "undici"\n` + data

      gatherPagesPath = path.join(config.sub.tempDir, fileName)

      return await fs
        .outputFile(gatherPagesPath, data)
        .then(() => {
          hasPages = true
        })
        .catch((err) => {
          console.error(err)
        })
    })
  )

  if (!hasPages) {
    return
  }

  const { gatherPages }: { gatherPages: GatherPages } = await import(
    gatherPagesPath
  )
  const pages = await gatherPages(config)

  if (pages.length === 0) {
    return []
  }

  await Promise.all(
    pages.map(async (item) => {
      let fileName = item.fileName
      let data = item.html

      if (!data) {
        return
      }

      if (hasBundle) {
        data = data.replace(/data-minista-build-bundle-href=/g, "href=")
      } else {
        data = data.replace(
          /<link.*data-minista-build-bundle-href=.*?>/g,
          "\n\n"
        )
      }
      if (config.main.beautify.useHtml) {
        data = beautify.html(data, config.main.beautify.htmlOptions)
      }

      const routePath = path.join(
        config.sub.resolvedRoot,
        config.main.out,
        fileName
      )
      const relativePath = path.relative(process.cwd(), routePath)
      const dataSize = (data.length / 1024).toFixed(2)

      return await fs
        .outputFile(routePath, data)
        .then(() => {
          console.log(
            `${pc.bold(pc.green("BUILD"))} ${pc.bold(relativePath)}` +
              " " +
              pc.gray(`${dataSize} KiB`) // / gzip: ${dataGzipSize} KiB
          )
        })
        .catch((err) => {
          console.error(err)
        })
    })
  )
}
