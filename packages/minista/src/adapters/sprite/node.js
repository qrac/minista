// @ts-check

import fs from "node:fs"
import path from "node:path"
import { parse } from "node-html-parser"
import { optimize } from "svgo"
import { glob } from "tinyglobby"

import { toProjectPath } from "../../core/graph/index.js"

/** @typedef {import("svgo").Config} SvgoConfig */

const spriteErrorCodes = Object.freeze({
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
    /** @type {Map<string, {viewBox: string, content: string}>} */
    const symbols = new Map()

    for (const svgName of svgNames) {
      const source = path.join(sourceDirectory, svgName)
      const code = await runSpriteOperation(
        "read",
        this.#rootDir,
        source,
        () => fs.promises.readFile(path.resolve(targetDir, svgName), "utf8"),
      )
      const root = await runSpriteOperation(
        "parse",
        this.#rootDir,
        source,
        () => parse(code),
      )
      if (code.includes("<symbol")) {
        const elements = root.querySelectorAll("symbol")
        if (elements.length === 0) {
          throw new NodeSpriteError(
            new Error("Expected at least one <symbol> element."),
            { operation: "parse", rootDir: this.#rootDir, source },
          )
        }
        for (const element of elements) {
          const id = element.getAttribute("id")
          const viewBox = element.getAttribute("viewBox")
          const { data: content } = await runSpriteOperation(
            "optimize",
            this.#rootDir,
            source,
            () => optimize(element.innerHTML, this.#config),
          )
          if (id && viewBox && content) symbols.set(id, { viewBox, content })
        }
      } else {
        const element = root.querySelector("svg")
        if (!element) {
          throw new NodeSpriteError(
            new Error("Expected an <svg> root element."),
            { operation: "parse", rootDir: this.#rootDir, source },
          )
        }
        const id = path.parse(svgName).name
        const viewBox = element.getAttribute("viewBox")
        const { data: content } = await runSpriteOperation(
          "optimize",
          this.#rootDir,
          source,
          () => optimize(element.innerHTML, this.#config),
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
