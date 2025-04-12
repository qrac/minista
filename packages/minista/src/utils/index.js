import fs from "node:fs"
import path from "node:path"

/**
 * @param {string[]} names
 * @returns {string}
 */
export function getPluginName(names) {
  return "vite-plugin:minista-" + names.join("-")
}

/**
 * @param {string[]} names
 * @returns {string}
 */
export function getTempName(names) {
  return "__minista_" + names.join("_")
}

/**
 * @param {string} cwd
 * @param {string} root
 * @returns {string}
 */
export function getRootDir(cwd, root) {
  return root === cwd ? cwd : path.resolve(cwd, root || "")
}

/**
 * @param {string} cwd
 * @param {string} rootDir
 * @returns {string}
 */
export function getTempDir(cwd, rootDir) {
  const absRootDir = path.resolve(cwd, rootDir)
  const hasRootPkg = fs.existsSync(path.join(absRootDir, "package.json"))
  const pkgDir = hasRootPkg ? absRootDir : cwd
  return path.join(pkgDir, "node_modules", ".minista")
}

/**
 * @param {string} srcPath
 * @param {string[]} [srcBases]
 * @returns {string}
 */
export function getPagePath(srcPath, srcBases = []) {
  const normalizedSrcPath = path.posix.normalize(srcPath)

  let relativePath = normalizedSrcPath

  for (const base of srcBases) {
    const normalizedBase = path.posix.normalize(base)
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

  return path.posix.normalize(pagePath)
}

/**
 * @param {string} pagePath
 * @returns {string}
 */
export function getHtmlPath(pagePath) {
  const normalized = pagePath.endsWith("/")
    ? `${pagePath}index.html`
    : `${pagePath}.html`
  return normalized.replace(/^\//, "")
}

/**
 * @param {string} pagePath
 * @param {Record<string, string|number>} paths
 * @returns {string}
 */
export function resolveParamPath(pagePath, paths) {
  let paramPath = pagePath
  for (const [key, value] of Object.entries(paths)) {
    paramPath = paramPath.replace(new RegExp(`:${key}`, "g"), String(value))
  }
  return paramPath
}
