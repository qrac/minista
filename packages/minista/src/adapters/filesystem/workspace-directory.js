// @ts-check

import fs from "node:fs"
import path from "node:path"

/** Resolve generated storage without creating it or consulting the launch directory.
 * @param {string} root
 * @returns {string}
 */
export function resolveWorkspaceDirectory(root) {
  const projectRoot = path.resolve(root)
  return path.join(projectRoot,
    fs.existsSync(path.join(projectRoot, "package.json"))
      ? "node_modules/.minista" : ".minista")
}
