// @ts-check

import fs from "node:fs"
import path from "node:path"
import { parse } from "node-html-parser"
import { optimize } from "svgo"

/** @typedef {import("svgo").Config} SvgoConfig */
/** @typedef {import("../../features/svg/index.js").SvgSource} SvgSource */

export class NodeSvgSourceResolver {
  #rootDir
  #config
  /** @type {Map<string, SvgSource | undefined>} */
  #cache = new Map()

  /**
   * @param {string} rootDir
   * @param {SvgoConfig} [config]
   */
  constructor(rootDir, config) {
    this.#rootDir = rootDir
    this.#config = config
  }

  /** @param {string} sourcePath */
  async resolve(sourcePath) {
    const normalizedPath = sourcePath.replace(/^\//, "")
    if (!normalizedPath) return undefined
    if (this.#cache.has(normalizedPath)) {
      return this.#cache.get(normalizedPath)
    }

    try {
      const rawSvg = await fs.promises.readFile(
        path.resolve(this.#rootDir, normalizedPath),
        "utf8",
      )
      const optimized = optimize(rawSvg, this.#config)
      const svg = parse(optimized.data).querySelector("svg")
      const source = svg
        ? Object.freeze({
            innerHtml: svg.innerHTML,
            viewBox: svg.getAttribute("viewBox"),
          })
        : undefined
      if (source) this.#cache.set(normalizedPath, source)
      return source
    } catch {
      return undefined
    }
  }
}
