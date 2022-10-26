import path from "node:path"
import fs from "fs-extra"
import pc from "picocolors"
import beautify from "js-beautify"

import type { ResolvedConfig } from "../config/index.js"
import type { BuildResult } from "../cli/build.js"
import type { RunSsg } from "../scripts/ssg.js"

export async function generateHtml({
  config,
  items,
  hasBundleCss,
}: {
  config: ResolvedConfig
  items: BuildResult["output"]
  hasBundleCss: boolean
}) {
  let hasPages = false
  let ssgPath = ""

  const ssgItem = items.find((item) =>
    item.fileName.match(/__minista_plugin_ssg\.js$/)
  )

  if (!ssgItem) {
    return
  }

  async function createSsgJsFile(item: BuildResult["output"][0]) {
    let fileName = item.fileName
    fileName = "ssg.mjs"

    let data = ""
    item.source && (data = item.source)
    item.code && (data = item.code)

    if (!data) {
      return
    }
    data = `import { fetch } from "undici"\n` + data

    ssgPath = path.join(config.sub.tempDir, fileName)

    return await fs
      .outputFile(ssgPath, data)
      .then(() => {
        hasPages = true
      })
      .catch((err) => {
        console.error(err)
      })
  }

  await createSsgJsFile(ssgItem)

  if (!hasPages) {
    return
  }

  const { runSsg }: { runSsg: RunSsg } = await import(ssgPath)
  const ssgPages = await runSsg(config)

  if (ssgPages.length === 0) {
    return []
  }

  await Promise.all(
    ssgPages.map(async (item) => {
      let fileName = item.fileName
      let data = item.html
      let hasPartialJs = false

      if (!data) {
        return
      }

      hasPartialJs = data.includes(
        `data-${config.main.assets.partial.rootAttrSuffix}`
      )

      if (hasBundleCss) {
        data = data.replace(/data-minista-build-bundle-href=/g, "href=")
      } else {
        data = data.replace(
          /<link.*data-minista-build-bundle-href=.*?>/g,
          "\n\n"
        )
      }

      if (hasPartialJs) {
        data = data.replace(/data-minista-build-partial-src=/g, "src=")
      } else {
        data = data.replace(
          /<script.*data-minista-build-partial-src=.*?><\/script>/g,
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
