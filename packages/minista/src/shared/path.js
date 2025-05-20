import fs from "node:fs"
import path from "node:path"

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
  const hasRootPkg = fs.existsSync(path.resolve(rootDir, "package.json"))
  const pkgDir = hasRootPkg ? rootDir : cwd
  return path.resolve(pkgDir, "node_modules", ".minista")
}

/**
 * @param {string} input
 * @returns {string}
 */
export function pathToId(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

/**
 * @param {string} input
 * @returns {string}
 */
export function idToPath(input) {
  const base64 = input
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(input.length / 4) * 4, "=")
  return Buffer.from(base64, "base64").toString("utf8")
}
