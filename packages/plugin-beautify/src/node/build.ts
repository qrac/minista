import type { Plugin } from "vite"
import type { OutputChunk, OutputAsset } from "rollup"
import picomatch from "picomatch"
import beautify from "js-beautify"

import type { PluginOptions } from "./option.js"

export function pluginBeautifyBuild(opts: PluginOptions): Plugin {
  const id = "__minista_beautify_build"

  let viteCommand: "build" | "serve"
  let isSsr = false

  return {
    name: "vite-plugin:minista-beautify-build",
    config: (config, { command }) => {
      viteCommand = command
      isSsr = config.build?.ssr ? true : false
    },
    generateBundle(options, bundle) {
      if (viteCommand === "build" && !isSsr) {
        const isMatch = picomatch(opts.src)
        const entryFiles = Object.keys(bundle).filter((file) => isMatch(file))

        entryFiles.map((file) => {
          const reg = new RegExp(/\.(html|css|js)$/)
          const ext = file.split(".").pop()

          if (!reg.test(file)) return

          if (ext === "html") {
            const output = bundle[file] as OutputAsset
            const source = output.source as string
            const newSource = beautify.html(source, opts.htmlOptions)
            return (output.source = newSource)
          } else if (ext === "css") {
            const output = bundle[file] as OutputAsset
            const source = output.source as string
            const newSource = beautify.css(source, opts.htmlOptions)
            return (output.source = newSource)
          } else if (ext === "js") {
            const output = bundle[file] as OutputChunk
            const source = output.code as string
            const newSource = beautify.js(source, opts.htmlOptions)
            return (output.code = newSource)
          }
        })
      }
    },
  }
}
