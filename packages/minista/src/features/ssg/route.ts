import {
  createNodeId,
  toProjectPath,
  type RouteNode,
  type RouteParam,
} from "../../core/graph/index.js"
import type { DiscoveredRoute, SsgDiscoveryOptions } from "./types.js"

function normalizeSourcePath(input: string): string {
  return input.replaceAll("\\", "/").replace(/^\.\//, "")
}

function withoutSourceBase(
  sourceFile: string,
  srcBases: readonly string[],
): string {
  const normalized = normalizeSourcePath(sourceFile)
  for (const base of srcBases) {
    const normalizedBase = normalizeSourcePath(base).replace(/^\/+|\/+$/g, "")
    const sourceWithoutRoot = normalized.replace(/^\/+/, "")
    if (
      sourceWithoutRoot === normalizedBase ||
      sourceWithoutRoot.startsWith(`${normalizedBase}/`)
    ) {
      return sourceWithoutRoot.slice(normalizedBase.length).replace(/^\/+/, "")
    }
  }
  return normalized.replace(/^\/+/, "")
}

export function parseRouteParams(sourceFile: string): readonly RouteParam[] {
  const params: RouteParam[] = []
  const pattern = /\[([^\]]+)\]/g
  for (const match of sourceFile.matchAll(pattern)) {
    const raw = match[1] ?? ""
    const rest = raw.startsWith("...")
    const optional = raw.startsWith("[") || raw.endsWith("?")
    const name = raw.replace(/^\.\.\./, "").replace(/^\[/, "").replace(/\]$/, "").replace(/\?$/, "")
    if (name) params.push(Object.freeze({ name, optional, rest }))
  }
  return Object.freeze(params)
}

export function sourceFileToRoutePattern(
  sourceFile: string,
  options: SsgDiscoveryOptions,
): string {
  const relative = withoutSourceBase(sourceFile, options.srcBases)
  const route = relative
    .replace(/index\.[^/]+$|\.[^/.]+$/g, "")
    .replace(/\[\.\.\.([^\]]+)\]/g, "*")
    .replace(/\[([^\]]+)\]/g, ":$1")
  return `/${route}`.replace(/\/{2,}/g, "/")
}

export function discoverRoute(
  sourceFile: string,
  options: SsgDiscoveryOptions,
): DiscoveredRoute {
  const projectPath = toProjectPath(sourceFile)
  const route: RouteNode = Object.freeze({
    id: createNodeId("route", projectPath),
    sourceFile: projectPath,
    pattern: sourceFileToRoutePattern(sourceFile, options),
    params: parseRouteParams(sourceFile),
    pageModuleId: `/${projectPath}`,
  })
  return Object.freeze({ route, sourceKey: sourceFile })
}

export function discoverRoutes(
  sourceFiles: readonly string[],
  options: SsgDiscoveryOptions,
): readonly DiscoveredRoute[] {
  return Object.freeze(
    [...new Set(sourceFiles)]
      .sort()
      .map((sourceFile) => discoverRoute(sourceFile, options)),
  )
}
