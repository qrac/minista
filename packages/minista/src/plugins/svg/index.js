/** @typedef {import('vite').Plugin} Plugin */
/** @typedef {import('./types').PluginOptions} PluginOptions */
/** @typedef {import('./types').UserPluginOptions} UserPluginOptions */

import fs from "node:fs"
import path from "node:path"
import { parse as parseHtml } from "node-html-parser"
import { optimize } from "svgo"

import { mergeObj } from "../../shared/obj.js"
import { getRootDir } from "../../shared/path.js"
import { filterOutputAssets } from "../../shared/vite.js"

/** @type {PluginOptions} */
const defaultOptions = {}

/**
 * @param {UserPluginOptions} uOpts
 * @returns {Plugin}
 */
export function pluginSvg(uOpts = {}) {
  /** @type {PluginOptions} */
  const opts = mergeObj(defaultOptions, uOpts)
  const cwd = process.cwd()
  const targetAttr = "data-minista-svg"
  const srcAttr = "data-minista-svg-src"

  let isDev = false
  let isSsr = false
  let isBuild = false

  let rootDir = ""
  /** @type {{[svgName: string]: string}} */
  let svgObj = {}

  /**
   * @param {string} html
   * @returns {Promise<string>}
   */
  async function selfOptimizeSvgHtml(html) {
    let parsedHtml = parseHtml(html)

    const targetEls = parsedHtml.querySelectorAll(`[${targetAttr}]`)
    if (!targetEls.length) return html

    for (const el of targetEls) {
      const svgName = el?.getAttribute(srcAttr)?.replace(/^\//, "") ?? ""
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
  }

  return {
    name: "vite-plugin:minista-svg",
    enforce: "pre",
    apply(_, { command, isSsrBuild }) {
      isDev = command === "serve"
      isSsr = command === "build" && Boolean(isSsrBuild)
      isBuild = command === "build" && !isSsrBuild
      return isDev || isBuild
    },
    config: async (config) => {
      rootDir = getRootDir(cwd, config.root || "")
    },
    async transformIndexHtml(html) {
      return await selfOptimizeSvgHtml(html)
    },
    async generateBundle(options, bundle) {
      const outputAssets = filterOutputAssets(bundle)
      const htmlItems = Object.values(outputAssets).filter((item) =>
        item.fileName.endsWith(".html"),
      )
      for (const item of htmlItems) {
        item.source = await selfOptimizeSvgHtml(String(item.source))
      }
    },
  }
}
