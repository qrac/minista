// @ts-check

import fs from "node:fs"
import path from "node:path"
import { parse } from "node-html-parser"
import { optimize } from "svgo"
import { glob } from "tinyglobby"

/** @typedef {import("svgo").Config} SvgoConfig */

export class NodeSpriteBuilder {
  #rootDir
  #config

  /**
   * @param {string} rootDir
   * @param {SvgoConfig} [config]
   */
  constructor(rootDir, config) {
    this.#rootDir = rootDir
    this.#config = config
  }

  /** @param {string} sourceDirectory */
  async build(sourceDirectory) {
    const targetDir = path.resolve(this.#rootDir, sourceDirectory)
    const svgNames = await glob("*.svg", { cwd: targetDir })
    /** @type {Map<string, {viewBox: string, content: string}>} */
    const symbols = new Map()

    for (const svgName of svgNames) {
      const code = await fs.promises.readFile(
        path.resolve(targetDir, svgName),
        "utf8",
      )
      if (code.includes("<symbol")) {
        const elements = parse(code).querySelectorAll("symbol")
        for (const element of elements) {
          const id = element.getAttribute("id")
          const viewBox = element.getAttribute("viewBox")
          const { data: content } = optimize(element.innerHTML, this.#config)
          if (id && viewBox && content) symbols.set(id, { viewBox, content })
        }
      } else {
        const element = parse(code).querySelector("svg")
        const id = path.parse(svgName).name
        const viewBox = element?.getAttribute("viewBox")
        const { data: content } = optimize(
          element?.innerHTML ?? "",
          this.#config,
        )
        if (id && viewBox && content) symbols.set(id, { viewBox, content })
      }
    }

    if (symbols.size === 0) return ""
    return [
      '<svg xmlns="http://www.w3.org/2000/svg" style="display:none">',
      [...symbols.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(
          ([id, { viewBox, content }]) =>
            `<symbol id="${id}" viewBox="${viewBox}">${content}</symbol>`,
        )
        .join("\n"),
      "</svg>",
    ].join("\n")
  }
}
