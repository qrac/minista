import type { Plugin } from "vite"
import type { OutputChunk, OutputAsset } from "rollup"
import picomatch from "picomatch"
import beautify from "js-beautify"

import { getPluginName } from "minista-shared-utils"

import type { PluginOptions } from "./option.js"

export function pluginBeautifyBuild(opts: PluginOptions): Plugin {
  const names = ["beautify", "build"]
  const pluginName = getPluginName(names)

  let isSsr = false

  return {
    name: pluginName,
    enforce: "pre",
    apply: "build",
    config: (config) => {
      isSsr = config.build?.ssr ? true : false
    },
    generateBundle(options, bundle) {
      if (!isSsr) {
        const isMatch = picomatch(opts.src)
        const reg = /\.(html|css|js)$/

        for (const file of Object.keys(bundle)) {
          if (!isMatch(file) || !reg.test(file)) continue

          const ext = file.split(".").pop()

          if (ext === "html") {
            const output = bundle[file] as OutputAsset
            const source = output.source as string
            const newSource = beautify.html(source, opts.htmlOptions)
            output.source = newSource
          } else if (ext === "css") {
            const output = bundle[file] as OutputAsset
            const source = output.source as string
            const newSource = beautify.css(source, opts.htmlOptions)
            output.source = newSource
          } else if (ext === "js") {
            const output = bundle[file] as OutputChunk
            const source = output.code as string
            const newSource = beautify.js(source, opts.htmlOptions)
            output.code = newSource
          }
        }
      }
    },
  }
}
