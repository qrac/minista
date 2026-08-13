// @ts-check

import fs from "node:fs"
import path from "node:path"
import { parse } from "node-html-parser"
import { optimize } from "svgo"

import { toProjectPath } from "../../core/graph/index.js"

/** @typedef {import("svgo").Config} SvgoConfig */
/** @typedef {import("../../features/svg/index.js").SvgSource} SvgSource */

const svgSourceErrorCodes = Object.freeze({
  read: "MINISTA_SVG_READ_FAILED",
  optimize: "MINISTA_SVG_OPTIMIZE_FAILED",
  parse: "MINISTA_SVG_PARSE_FAILED",
})

/** @param {string} rootDir @param {string} sourcePath */
function svgLocation(rootDir, sourcePath) {
  const absoluteRoot = path.resolve(rootDir)
  const absoluteSource = path.resolve(absoluteRoot, sourcePath)
  const relativeSource = path.relative(absoluteRoot, absoluteSource)
  if (
    !relativeSource || relativeSource === ".." ||
    relativeSource.startsWith(`..${path.sep}`)
  ) {
    return undefined
  }
  return Object.freeze({ file: toProjectPath(relativeSource) })
}

export class NodeSvgSourceError extends Error {
  /**
   * @param {unknown} cause
   * @param {import("./node-svg-source.js").NodeSvgSourceErrorOptions} options
   */
  constructor(cause, options) {
    const detail = cause instanceof Error ? cause.message : String(cause)
    const location = svgLocation(options.rootDir, options.sourcePath)
    const displaySource = location?.file || path.basename(options.sourcePath) ||
      "SVG source"
    const message = `SVG ${options.operation} failed for ${displaySource}: ${detail}`
    super(message, cause instanceof Error ? { cause } : undefined)
    this.name = "NodeSvgSourceError"
    this.code = svgSourceErrorCodes[options.operation]
    this.operation = options.operation
    this.sourcePath = options.sourcePath
    this.diagnostic = Object.freeze({
      code: this.code,
      severity: "error",
      message,
      hint: "Check the SVG source markup and SVGO options.",
      phase: "compose",
      feature: "feature:svg",
      ...(location ? { location } : {}),
    })
  }
}

/**
 * @template Result
 * @param {import("./node-svg-source.js").NodeSvgSourceOperation} operation
 * @param {string} rootDir
 * @param {string} sourcePath
 * @param {() => Result | Promise<Result>} task
 */
async function runSvgSourceOperation(operation, rootDir, sourcePath, task) {
  try {
    return await task()
  } catch (error) {
    if (error instanceof NodeSvgSourceError) throw error
    throw new NodeSvgSourceError(error, { operation, rootDir, sourcePath })
  }
}

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

    let rawSvg
    try {
      rawSvg = await fs.promises.readFile(
        path.resolve(this.#rootDir, normalizedPath),
        "utf8",
      )
    } catch (error) {
      if (error && typeof error === "object" && Reflect.get(error, "code") === "ENOENT") {
        return undefined
      }
      throw new NodeSvgSourceError(error, {
        operation: "read",
        rootDir: this.#rootDir,
        sourcePath: normalizedPath,
      })
    }
    const optimized = await runSvgSourceOperation(
      "optimize",
      this.#rootDir,
      normalizedPath,
      () => optimize(rawSvg, this.#config),
    )
    const svg = await runSvgSourceOperation(
      "parse",
      this.#rootDir,
      normalizedPath,
      () => parse(optimized.data).querySelector("svg"),
    )
    if (!svg) {
      throw new NodeSvgSourceError(
        new Error("Expected an <svg> root element."),
        { operation: "parse", rootDir: this.#rootDir, sourcePath: normalizedPath },
      )
    }
    const source = Object.freeze({
      innerHtml: svg.innerHTML,
      viewBox: svg.getAttribute("viewBox"),
    })
    this.#cache.set(normalizedPath, source)
    return source
  }
}
