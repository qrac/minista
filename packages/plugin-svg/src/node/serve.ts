import type { Plugin, UserConfig } from "vite"
import fs from "node:fs"
import path from "node:path"
import { parse as parseHtml } from "node-html-parser"
import { optimize } from "svgo"

import {
  checkDeno,
  getCwd,
  getPluginName,
  getRootDir,
} from "minista-shared-utils"

import type { PluginOptions } from "./option.js"

export function pluginSvgServe(opts: PluginOptions): Plugin {
  const isDeno = checkDeno()
  const cwd = getCwd(isDeno)
  const names = ["svg", "serve"]
  const pluginName = getPluginName(names)
  const targetAttr = "data-minista-svg"
  const srcAttr = "data-minista-svg-src"

  let rootDir = ""

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
        const src = el.getAttribute(srcAttr) || ""
        if (!src) continue

        let svgData = ""

        const fullPath = path.join(rootDir, src)
        svgData = await fs.promises.readFile(fullPath, "utf8")
        svgData = optimize(svgData, opts.svgo).data
        if (!svgData) continue

        const parsedSvg = parseHtml(svgData).querySelector("svg")

        if (!parsedSvg) continue

        const viewBox =
          el.getAttribute("viewBox") ||
          parsedSvg.getAttribute("viewBox") ||
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
