import type { Plugin, UserConfig } from "vite"
import type { OutputAsset } from "rollup"
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

export function pluginSvgBuild(opts: PluginOptions): Plugin {
  const isDeno = checkDeno()
  const cwd = getCwd(isDeno)
  const names = ["svg", "build"]
  const pluginName = getPluginName(names)
  const targetAttr = "data-minista-svg"
  const srcAttr = "data-minista-svg-src"

  let isSsr = false
  let rootDir = ""
  let svgObj: { [key: string]: string } = {}

  return {
    name: pluginName,
    enforce: "pre",
    apply: "build",
    config: async (config) => {
      isSsr = config.build?.ssr ? true : false
      rootDir = getRootDir(cwd, config.root || "")
    },
    async generateBundle(options, bundle) {
      if (!isSsr) {
        const htmlItems = Object.values(bundle).filter((item) => {
          return item.fileName.endsWith(".html") && item.type === "asset"
        }) as OutputAsset[]

        for (const item of htmlItems) {
          let parsedHtml = parseHtml(item.source as string)
          const targetEls = parsedHtml.querySelectorAll(`[${targetAttr}]`)

          if (!targetEls.length) continue

          for (const el of targetEls) {
            const src = el.getAttribute(srcAttr) || ""
            if (!src) continue

            let svgData = ""

            if (Object.hasOwn(svgObj, src)) {
              svgData = svgObj[src]
            } else {
              const fullPath = path.join(rootDir, src)
              svgData = await fs.promises.readFile(fullPath, "utf8")
              svgData = optimize(svgData, opts.svgo).data
              svgObj[src] = svgData
            }
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
          item.source = parsedHtml.toString()
        }
      }
    },
  }
}
