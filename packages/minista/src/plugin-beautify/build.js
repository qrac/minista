import picomatch from "picomatch"
import { parse } from "node-html-parser"
import beautify from "js-beautify"

import { getPluginName } from "../utils/name.js"
import { filterOutputAssets, filterOutputChunks } from "../utils/vite.js"

/** @typedef {import('vite').Plugin} Plugin */
/** @typedef {import('./types').PluginOptions} PluginOptions */

/**
 * @param {PluginOptions} opts
 * @returns {Plugin}
 */
export function pluginBeautifyBuild(opts) {
  const names = ["beautify", "build"]
  const pluginName = getPluginName(names)

  let isSsr = false

  return {
    name: pluginName,
    enforce: "post",
    apply: "build",
    config: (config) => {
      isSsr = config.build?.ssr ? true : false
    },
    generateBundle(options, bundle) {
      if (!isSsr) {
        const isMatch = picomatch(opts.src)
        const parseOpts = [opts.removeImagePreload]
        const needParse = parseOpts.some((item) => item)
        const regAssets = /\.(html|css)$/
        const regChunks = /\.js$/

        const outputAssets = filterOutputAssets(bundle)
        const outputChunks = filterOutputChunks(bundle)

        for (const item of Object.values(outputAssets)) {
          if (!isMatch(item.fileName)) continue
          if (!regAssets.test(item.fileName)) continue

          const ext = item.fileName.split(".").pop()

          let newSource = String(item.source)

          if (ext === "html") {
            if (needParse) {
              const root = parse(newSource)

              if (opts.removeImagePreload) {
                root
                  .querySelectorAll("body > link[rel=preload][as=image]")
                  .forEach((el) => {
                    el.remove()
                  })
              }
              newSource = root.toString()
            }
            newSource = beautify.html(newSource, opts.htmlOptions)
            item.source = newSource
          } else if (ext === "css") {
            newSource = beautify.css(newSource, opts.cssOptions)
            item.source = newSource
          }
        }

        for (const item of Object.values(outputChunks)) {
          if (!isMatch(item.fileName)) continue
          if (!regChunks.test(item.fileName)) continue

          let newSource = item.code

          newSource = beautify.js(newSource, opts.jsOptions)
          item.code = newSource
        }
      }
    },
  }
}
