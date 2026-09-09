// @ts-check

import fs from "node:fs"
import path from "node:path"
import { parse } from "node-html-parser"
import { optimizeSvg, namespaceSvg, readSvgSource } from "../html/svg-source.js"
import { glob } from "tinyglobby"

import { toProjectPath } from "../../core/graph/index.js"

/** @typedef {import("svgo").Config} SvgoConfig */

const spriteErrorCodes = Object.freeze({
  duplicate: "MINISTA_SPRITE_DUPLICATE_SYMBOL",
  discover: "MINISTA_SPRITE_DISCOVERY_FAILED",
  read: "MINISTA_SPRITE_READ_FAILED",
  parse: "MINISTA_SPRITE_PARSE_FAILED",
  optimize: "MINISTA_SPRITE_OPTIMIZE_FAILED",
})

/** @param {string} rootDir @param {string} source */
function spriteLocation(rootDir, source) {
  const absoluteRoot = path.resolve(rootDir)
  const absoluteSource = path.resolve(absoluteRoot, source)
  const relativeSource = path.relative(absoluteRoot, absoluteSource)
  if (
    !relativeSource || relativeSource === ".." ||
    relativeSource.startsWith(`..${path.sep}`)
  ) {
    return undefined
  }
  return Object.freeze({ file: toProjectPath(relativeSource) })
}

export class NodeSpriteError extends Error {
  /**
   * @param {unknown} cause
   * @param {import("./node.js").NodeSpriteErrorOptions} options
   */
  constructor(cause, options) {
    const detail = cause instanceof Error ? cause.message : String(cause)
    const location = spriteLocation(options.rootDir, options.source)
    const displaySource = location?.file || path.basename(options.source) ||
      "sprite source"
    const message = `Sprite ${options.operation} failed for ${displaySource}: ${detail}`
    super(message, cause instanceof Error ? { cause } : undefined)
    this.name = "NodeSpriteError"
    this.code = spriteErrorCodes[options.operation]
    this.operation = options.operation
    this.source = options.source
    this.diagnostic = Object.freeze({
      code: this.code,
      severity: "error",
      message,
      hint: "Check the sprite source directory, SVG markup, and SVGO options.",
      phase: "generate",
      feature: "feature:sprite",
      ...(location ? { location } : {}),
    })
  }
}

/**
 * @template Result
 * @param {import("./node.js").NodeSpriteOperation} operation
 * @param {string} rootDir
 * @param {string} source
 * @param {() => Result | Promise<Result>} task
 */
async function runSpriteOperation(operation, rootDir, source, task) {
  try {
    return await task()
  } catch (error) {
    if (
      error instanceof Error &&
      typeof Reflect.get(error, "code") === "string" &&
      Reflect.get(error, "code").startsWith("MINISTA_")
    ) {
      throw error
    }
    throw new NodeSpriteError(error, { operation, rootDir, source })
  }
}

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
    const svgNames = await runSpriteOperation(
      "discover",
      this.#rootDir,
      sourceDirectory,
      () => glob("*.svg", { cwd: targetDir }),
    )
    /** @type {Map<string, string>} */
    const owners = new Map()
    const documents = []
    for (const svgName of svgNames.sort()) {
      const source = path.join(sourceDirectory, svgName)
      const code = await runSpriteOperation("read", this.#rootDir, source,
        () => fs.promises.readFile(path.resolve(targetDir, svgName), "utf8"))
      const root = parse(code).querySelector("svg")
      if (!root) throw new NodeSpriteError(new Error("Expected an <svg> root element."),
        { operation: "parse", rootDir: this.#rootDir, source })
      let symbols = root.querySelectorAll("symbol")
      if (!symbols.length) {
        const symbol = parse("<symbol></symbol>").querySelector("symbol")
        if (!symbol) throw new Error("Expected symbol")
        symbol.setAttribute("id", path.parse(svgName).name)
        for (const [name, value] of Object.entries(readSvgSource(root).attributes)) {
          if (!name.startsWith("xmlns")) symbol.setAttribute(name, value)
        }
        symbol.set_content(root.innerHTML)
        root.set_content(symbol.toString())
        for (const name of Object.keys(root.attributes)) root.removeAttribute(name)
        symbols = root.querySelectorAll("symbol")
      }
      const ids = symbols.map(element => element.getAttribute("id")).filter(id => id !== undefined)
      for (const id of ids) {
        if (owners.has(id)) throw new NodeSpriteError(
          new Error(`Duplicate symbol "${id}" in ${owners.get(id)} and ${toProjectPath(source)}.`),
          { operation: "duplicate", rootDir: this.#rootDir, source })
        owners.set(id, toProjectPath(source))
      }
      // Isolate symbol-local definitions while retaining references to shared definitions.
      const allIds = root.querySelectorAll("[id]").map(element => element.getAttribute("id")).filter(id => id !== undefined)
      for (const symbol of symbols) {
        const localIds = new Set(symbol.querySelectorAll("[id]").map(element => element.getAttribute("id")))
        const externalIds = allIds.filter(id => !localIds.has(id))
        const isolated = await runSpriteOperation("optimize", this.#rootDir, source,
          () => namespaceSvg(symbol.toString(), `symbol:${symbol.getAttribute("id")}`, externalIds))
        symbol.replaceWith(isolated)
      }
      // Keep symbols in their source document so shared defs and inherited attributes survive.
      const content = await runSpriteOperation("optimize", this.#rootDir, source, async () => {
        const config = { ...this.#config, plugins: this.#config?.plugins ?? [{ name: "preset-default", params: {
          overrides: { cleanupIds: false, removeHiddenElems: false },
        } }] }
        const optimized = await optimizeSvg(root.toString(), config)
        const remainingIds = parse(optimized.data).querySelectorAll("symbol").map(element => element.getAttribute("id"))
        if (ids.some(id => !remainingIds.includes(id))) throw new Error("SVGO configuration removed or renamed a public symbol ID. Disable cleanupIds and removeHiddenElems.")
        const namespaced = await namespaceSvg(optimized.data, toProjectPath(path.relative(this.#rootDir, path.resolve(targetDir, svgName))), ids)
        const element = parse(namespaced).querySelector("svg")
        if (!element) throw new Error("Expected optimized SVG root")
        const group = parse("<g></g>").querySelector("g")
        if (!group) throw new Error("Expected group")
        for (const [name, value] of Object.entries(readSvgSource(element).attributes)) {
          if (!name.startsWith("xmlns")) group.setAttribute(name, value)
        }
        group.set_content(element.innerHTML)
        return Object.keys(group.attributes).length ? group.toString() : group.innerHTML
      })
      documents.push(content)
    }
    if (!documents.length) return ""
    return '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style="display:none">\n' + documents.join("\n") + "\n</svg>"
  }
}
