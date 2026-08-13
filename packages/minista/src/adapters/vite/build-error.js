// @ts-check

import path from "node:path"

import { toProjectPath } from "../../core/graph/index.js"

/**
 * @param {unknown} error
 * @returns {error is Error & {code: `MINISTA_${string}`}}
 */
function isMinistaError(error) {
  return error instanceof Error &&
    typeof Reflect.get(error, "code") === "string" &&
    Reflect.get(error, "code").startsWith("MINISTA_")
}

/** @param {unknown} error */
function getErrorMessage(error) {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === "string" && error) return error
  return "Unknown Vite build error."
}

/**
 * @param {unknown} error
 * @param {string} root
 * @returns {import("../../core/diagnostics/index.js").DiagnosticLocation | undefined}
 */
function getErrorLocation(error, root) {
  if (!error || typeof error !== "object") return undefined
  const loc = Reflect.get(error, "loc")
  const locFile = loc && typeof loc === "object"
    ? Reflect.get(loc, "file")
    : undefined
  const id = locFile ?? Reflect.get(error, "id")
  if (typeof id !== "string" || id.startsWith("\0")) return undefined

  const cleanId = id.replace(/[?#].*$/, "")
  if (!cleanId) return undefined
  const absoluteRoot = path.resolve(root)
  const absoluteFile = path.isAbsolute(cleanId)
    ? path.resolve(cleanId)
    : path.resolve(absoluteRoot, cleanId)
  const relativeFile = path.relative(absoluteRoot, absoluteFile)
  if (relativeFile === ".." || relativeFile.startsWith(`..${path.sep}`)) {
    return undefined
  }

  const line = loc && typeof loc === "object"
    ? Reflect.get(loc, "line")
    : undefined
  const column = loc && typeof loc === "object"
    ? Reflect.get(loc, "column")
    : undefined
  return Object.freeze({
    file: toProjectPath(relativeFile),
    ...(Number.isInteger(line) && line > 0 ? { line } : {}),
    ...(Number.isInteger(column) && column >= 0 ? { column } : {}),
  })
}

export class ViteBuildError extends Error {
  code = "MINISTA_VITE_BUILD_FAILED"

  /**
   * @param {unknown} cause
   * @param {import("./build-error.js").ViteBuildErrorOptions} options
   */
  constructor(cause, options) {
    const detail = getErrorMessage(cause)
    const message = `Vite ${options.environment} environment build failed: ${detail}`
    const location = getErrorLocation(cause, options.root)
    super(message, cause instanceof Error ? { cause } : undefined)
    this.name = "ViteBuildError"
    this.environment = options.environment
    this.diagnostic = Object.freeze({
      code: this.code,
      severity: "error",
      message,
      phase: options.phase ?? "bundle",
      ...(location ? { location } : {}),
      hint: "Review the referenced module and the preceding Vite log.",
    })
  }
}

/**
 * Preserve errors that already belong to a stable Minista boundary and wrap
 * arbitrary Vite/Rolldown failures in one machine-readable diagnostic.
 *
 * @param {unknown} error
 * @param {import("./build-error.js").ViteBuildErrorOptions} options
 */
export function normalizeViteBuildError(error, options) {
  if (isMinistaError(error)) return error
  return new ViteBuildError(error, options)
}
