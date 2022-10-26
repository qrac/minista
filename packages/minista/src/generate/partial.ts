import path from "node:path"
import fs from "fs-extra"
import pc from "picocolors"
import beautify from "js-beautify"

import type { ResolvedConfig } from "../config/index.js"
import type { BuildResult } from "../cli/build.js"

export async function generatePartial({
  config,
  items,
}: {
  config: ResolvedConfig
  items: BuildResult["output"]
}) {
  const partialItem = items.find((item) =>
    item.fileName.match(/__minista_plugin_get_partial\.js$/)
  )

  if (!partialItem) {
    return
  }

  let fileName = path.join(
    config.main.assets.outDir,
    config.main.assets.partial.outName + ".js"
  )

  let data = ""
  partialItem.source && (data = partialItem.source)
  partialItem.code && (data = partialItem.code)

  if (!data || data === "\n") {
    return
  }

  if (config.main.beautify.useAssets) {
    data = beautify.js(data, config.main.beautify.jsOptions)
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
          pc.gray(`${dataSize} KiB`)
      )
    })
    .catch((err) => {
      console.error(err)
    })
}
