/** @typedef {import('vite').Plugin} Plugin */
/** @typedef {import('./types').PluginOptions} PluginOptions */

import fs from "node:fs"
import path from "node:path"
import { parse as parseHtml } from "node-html-parser"
import { optimize } from "svgo"

import { getPluginName } from "../../shared/name.js"
import { getRootDir } from "../../shared/path.js"
import { filterOutputAssets } from "../../shared/vite.js"

/**
 * @param {PluginOptions} opts
 * @returns {Plugin}
 */
export function pluginSvgBuild(opts) {
  const cwd = process.cwd()
  const names = ["svg", "build"]
  const pluginName = getPluginName(names)
  const targetAttr = "data-minista-svg"
  const srcAttr = "data-minista-svg-src"

  let isSsr = false
  let rootDir = ""
  /** @type {{[svgName: string]: string}} */
  let svgObj = {}

  return {
    name: pluginName,
    enforce: "pre",
    apply: "build",
    config: async (config) => {
      isSsr = !!config.build?.ssr
      rootDir = getRootDir(cwd, config.root || "")
    },
    async generateBundle(options, bundle) {
      if (isSsr) return

      const outputAssets = filterOutputAssets(bundle)
      const htmlItems = Object.values(outputAssets).filter((item) =>
        item.fileName.endsWith(".html")
      )

      for (const item of htmlItems) {
        let parsedHtml = parseHtml(String(item.source))

        const targetEls = parsedHtml.querySelectorAll(`[${targetAttr}]`)
        if (targetEls.length === 0) continue

        for (const el of targetEls) {
          const svgName = el.getAttribute(srcAttr).replace(/^\//, "") ?? ""
          if (!svgName) continue

          let svgData = svgObj[svgName]

          if (!svgData) {
            const fullPath = path.resolve(rootDir, svgName)
            try {
              const rawSvg = await fs.promises.readFile(fullPath, "utf8")
              const result = optimize(rawSvg, opts.config)
              svgData = result.data
              svgObj[svgName] = svgData
            } catch {
              continue
            }
          }

          if (!svgData) continue

          const parsedSvg = parseHtml(svgData).querySelector("svg")
          if (!parsedSvg) continue

          const viewBox =
            el.getAttribute("viewBox") ??
            parsedSvg.getAttribute("viewBox") ??
            "0 0 0 0"

          el.setAttribute("viewBox", viewBox)
          el.removeAttribute(targetAttr)
          el.removeAttribute(srcAttr)

          parsedSvg.childNodes.forEach((child) => {
            el.appendChild(child)
          })
        }

        item.source = parsedHtml.toString()
      }
    },
  }
}
