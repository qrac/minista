import path from "node:path"
import { normalizePath } from "vite"

/**
 * @param {string} srcPath
 * @param {string[]} [srcBases]
 * @returns {string}
 */
export function getPageUrl(srcPath, srcBases = []) {
  const normalizedSrcPath = normalizePath(srcPath)

  let relativePath = normalizedSrcPath

  for (const base of srcBases) {
    const normalizedBase = normalizePath(base)
    if (normalizedSrcPath.startsWith(normalizedBase)) {
      relativePath = normalizedSrcPath.slice(normalizedBase.length)
      break
    }
  }
  let pagePath = "/" + relativePath.replace(/^\/+/, "")

  pagePath = pagePath
    .replace(/index\.[^\/]+?$|(\.[^\/.]+)$/g, "")
    .replace(/\[(\.{3}.+?)\]/g, "*")
    .replace(/\[(.+?)\]/g, ":$1")

  return normalizePath(pagePath)
}

/**
 * @param {string} url
 * @param {Record<string, string|number>} paths
 * @returns {string}
 */
export function resolveParamUrl(url, paths) {
  let paramUrl = url
  for (const [key, value] of Object.entries(paths)) {
    paramUrl = paramUrl.replace(new RegExp(`:${key}`, "g"), String(value))
  }
  return paramUrl
}

/**
 * @param {string} html
 * @param {string} tag
 * @param {string} attr
 * @param {string} [start]
 * @returns {string[]}
 */
export function extractUrls(html, tag, attr, start) {
  const regex = new RegExp(`<${tag}[^>]*?\\b${attr}="([^"]*?)"`, "gs")
  const rootPaths = new Set()

  let match
  while ((match = regex.exec(html)) !== null) {
    const matchPath = match[1]
    const pathList = matchPath.split(",")

    for (const pathItem of pathList) {
      const item = pathItem.trim().split(/[#? ]/)[0]
      if (!item) continue
      if (start && !item.startsWith(start)) continue
      rootPaths.add(item)
    }
  }
  return Array.from(rootPaths).sort()
}

/**
 * @param {string} base
 * @returns {string}
 */
export function getServeBase(base) {
  if (!base) return "/"
  try {
    const url = new URL(base, "https://dummy.com")
    return url.pathname
  } catch {
    return base
  }
}

/**
 * @param {string} base
 * @returns {string}
 */
export function getBuildBase(base) {
  if (base === "./" || base === "") return base
  if (!base) return "/"
  if (/^https?:\/\//.test(base)) return base
  try {
    const url = new URL(base, "https://dummy.com")
    return url.pathname
  } catch {
    return base
  }
}

/**
 * @param {string} base
 * @param {string} htmlName
 * @param {string} assetName
 * @returns {string}
 */
export function getBasedAssetUrl(base, htmlName, assetName) {
  if (base === "./" || base === "") {
    return normalizePath(path.relative(path.dirname(htmlName), assetName))
  }
  return normalizePath(base.replace(/\/$/, "") + "/" + assetName)
}
