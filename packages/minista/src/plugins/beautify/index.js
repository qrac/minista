/** @typedef {import('vite').Plugin} Plugin */
/** @typedef {import('./types').PluginOptions} PluginOptions */
/** @typedef {import('./types').UserPluginOptions} UserPluginOptions */

import picomatch from "picomatch"
import { parse as parseHtml } from "node-html-parser"
import beautify from "js-beautify"

import { mergeObj } from "../../shared/obj.js"
import { filterOutputAssets, filterOutputChunks } from "../../shared/vite.js"

/** @type {PluginOptions} */
export const defaultOptions = {
  src: ["**/*.{html,css,js}"],
  htmlOptions: {
    indent_size: 2,
    max_preserve_newlines: 0,
    indent_inner_html: true,
    extra_liners: [],
    inline: ["span", "strong", "b", "small", "del", "s", "code", "br", "wbr"],
  },
  cssOptions: {
    indent_size: 2,
    space_around_combinator: true,
  },
  jsOptions: {
    indent_size: 2,
  },
  removeImagePreload: true,
}

/**
 * @param {UserPluginOptions} uOpts
 * @returns {Plugin}
 */
export function pluginBeautify(uOpts = {}) {
  /** @type {PluginOptions} */
  const opts = mergeObj(defaultOptions, uOpts)

  let isDev = false
  let isSsr = false
  let isBuild = false

  return {
    name: "vite-plugin:minista-beautify",
    enforce: "post",
    apply(_, { command, isSsrBuild }) {
      isDev = command === "serve"
      isSsr = command === "build" && Boolean(isSsrBuild)
      isBuild = command === "build" && !isSsrBuild
      return isBuild
    },
    generateBundle(options, bundle) {
      const isMatch = picomatch(opts.src)
      const parseOpts = [opts.removeImagePreload]
      const hasParse = parseOpts.some((item) => item)
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
          if (hasParse) {
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
