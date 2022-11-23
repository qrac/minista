import type { Plugin } from "vite"
import path from "node:path"

import type { ResolvedConfig } from "../config/index.js"
import { resolveBase } from "../utility/base.js"

export function pluginDelivery(config: ResolvedConfig): Plugin {
  return {
    name: "minista-vite-plugin:delivery",

    transform(code, id) {
      if (
        config.main.delivery.archives.length &&
        id.match(/minista(\/|\\)dist(\/|\\)shared(\/|\\)delivery\.js$/)
      ) {
        const resolvedBase = resolveBase(config.main.base)

        const archives = config.main.delivery.archives.map((item) => {
          const outFile = item.outName + "." + item.format
          const fileName = path.join(item.outDir, outFile)
          const text = item.button?.text ? item.button.text : fileName
          const link = path.join(resolvedBase, fileName)
          const color = item.button?.color ? item.button.color : undefined
          return { text, link, color }
        })
        const replacedCode = code.replace(
          /const archives = \[\]/,
          `const archives = ${JSON.stringify(archives)}`
        )
        return {
          code: replacedCode,
          map: null,
        }
      }
    },
  }
}
