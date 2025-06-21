/** @typedef {import('rolldown-vite').Plugin} Plugin */
/** @typedef {import('./types').PluginOptions} PluginOptions */

import picomatch from "picomatch"
import { parse as parseHtml } from "node-html-parser"
import beautify from "js-beautify"

import { getPluginName } from "../../shared/name.js"
import { filterOutputAssets, filterOutputChunks } from "../../shared/vite.js"

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
      isSsr = !!config.build?.ssr
    },
    generateBundle(options, bundle) {
      if (isSsr) return

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
            let parsedHtml = parseHtml(newSource)

            if (opts.removeImagePreload) {
              parsedHtml
                .querySelectorAll("body > link[rel=preload][as=image]")
                .forEach((el) => {
                  el.remove()
                })
            }
            newSource = parsedHtml.toString()
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
    },
  }
}
