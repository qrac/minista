// @ts-check

import { createNodeId, toProjectPath } from "../../core/graph/index.js"

/** @typedef {import("../../core/graph/index.js").RouteParam} RouteParam */
/** @typedef {import("./types.js").DiscoveredRoute} DiscoveredRoute */
/** @typedef {import("./types.js").SsgDiscoveryOptions} SsgDiscoveryOptions */

/** @param {string} input */
function normalizeSourcePath(input) {
  return input.replaceAll("\\", "/").replace(/^\.\//, "")
}
/**
 * @param {string} sourceFile
 * @param {readonly string[]} srcBases
 */
function withoutSourceBase(sourceFile, srcBases) {
  const normalized = normalizeSourcePath(sourceFile)
  for (const base of srcBases) {
    const normalizedBase = normalizeSourcePath(base).replace(/^\/+|\/+$/g, "")
    const sourceWithoutRoot = normalized.replace(/^\/+/, "")
    if (sourceWithoutRoot === normalizedBase ||
      sourceWithoutRoot.startsWith(`${normalizedBase}/`)) {
      return sourceWithoutRoot.slice(normalizedBase.length).replace(/^\/+/, "")
    }
  }
  return normalized.replace(/^\/+/, "")
}
/**
 * @param {string} sourceFile
 * @returns {readonly RouteParam[]}
 */
export function parseRouteParams(sourceFile) {
  /** @type {RouteParam[]} */
  const params = []
  const pattern = /\[([^\]]+)\]/g
  for (const match of sourceFile.matchAll(pattern)) {
    const raw = match[1] ?? ""
    const rest = raw.startsWith("...")
    const optional = raw.startsWith("[") || raw.endsWith("?")
    const name = raw.replace(/^\.\.\./, "").replace(/^\[/, "").replace(/\]$/, "").replace(/\?$/, "")
    if (name)
      params.push(Object.freeze({ name, optional, rest }))
  }
  return Object.freeze(params)
}
/**
 * @param {string} sourceFile
 * @param {SsgDiscoveryOptions} options
 */
export function sourceFileToRoutePattern(sourceFile, options) {
  const relative = withoutSourceBase(sourceFile, options.srcBases)
  const route = relative
    .replace(/index\.[^/]+$|\.[^/.]+$/g, "")
    .replace(/\[\.\.\.([^\]]+)\]/g, "*")
    .replace(/\[([^\]]+)\]/g, ":$1")
  return `/${route}`.replace(/\/{2,}/g, "/")
}
/**
 * @param {string} sourceFile
 * @param {SsgDiscoveryOptions} options
 * @returns {DiscoveredRoute}
 */
export function discoverRoute(sourceFile, options) {
  const projectPath = toProjectPath(sourceFile)
  const route = Object.freeze({
    id: createNodeId("route", projectPath),
    sourceFile: projectPath,
    pattern: sourceFileToRoutePattern(sourceFile, options),
    params: parseRouteParams(sourceFile),
    pageModuleId: `/${projectPath}`,
  })
  return Object.freeze({ route, sourceKey: sourceFile })
}
/**
 * @param {readonly string[]} sourceFiles
 * @param {SsgDiscoveryOptions} options
 * @returns {readonly DiscoveredRoute[]}
 */
export function discoverRoutes(sourceFiles, options) {
  return Object.freeze([...new Set(sourceFiles)]
    .sort()
    .map((sourceFile) => discoverRoute(sourceFile, options)))
}
