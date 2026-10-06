// @ts-check

import path from "node:path"

import { toProjectPath } from "../../core/graph/index.js"

/**
 * Convert a Vite/Rolldown error location to a project-relative location.
 * Virtual modules and files outside the project root are intentionally omitted.
 *
 * @param {unknown} error
 * @param {string} root
 * @returns {import("../../core/diagnostics/index.js").DiagnosticLocation | undefined}
 */
export function getViteErrorLocation(error, root) {
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
