/** @typedef {import('vite').Plugin} Plugin */
/** @typedef {import('./types').PluginOptions} PluginOptions */

import fs from "node:fs"
import path from "node:path"
import { parse as parseHtml } from "node-html-parser"
import { optimize } from "svgo"

import { getPluginName } from "../../shared/name.js"
import { getRootDir } from "../../shared/path.js"

/**
 * @param {PluginOptions} opts
 * @returns {Plugin}
 */
export function pluginSvgServe(opts) {
  const cwd = process.cwd()
  const names = ["svg", "serve"]
  const pluginName = getPluginName(names)
  const targetAttr = "data-minista-svg"
  const srcAttr = "data-minista-svg-src"

  let rootDir = ""
  /** @type {{[svgName:string]: string}} */
  let svgObj = {}

  return {
    name: pluginName,
    enforce: "pre",
    apply: "serve",
    config: async (config) => {
      rootDir = getRootDir(cwd, config.root || "")
    },
    async transformIndexHtml(html) {
      let parsedHtml = parseHtml(html)

      const targetEls = parsedHtml.querySelectorAll(`[${targetAttr}]`)
      if (!targetEls.length) return html

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
      return parsedHtml.toString()
    },
  }
}
