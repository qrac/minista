import type { ProjectPath } from "../types.js"

export function toProjectPath(input: string): ProjectPath {
  const normalized = input
    .replaceAll("\\", "/")
    .replace(/^\.\//, "")
    .replace(/^\/+/, "")
    .replace(/\/{2,}/g, "/")

  if (!normalized || normalized === ".") return "." as ProjectPath

  const segments = normalized.split("/")
  if (segments.includes("..")) {
    throw new TypeError(`Project path must not escape the root: ${input}`)
  }

  return normalized as ProjectPath
}
