// @ts-check

import { getViteErrorLocation } from "./error-location.js"

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

export class ViteBuildError extends Error {
  code = "MINISTA_VITE_BUILD_FAILED"

  /**
   * @param {unknown} cause
   * @param {import("./build-error.js").ViteBuildErrorOptions} options
   */
  constructor(cause, options) {
    const detail = getErrorMessage(cause)
    const message = `Vite ${options.environment} environment build failed: ${detail}`
    const location = getViteErrorLocation(cause, options.root)
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
