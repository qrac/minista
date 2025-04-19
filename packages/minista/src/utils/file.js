import fs from "node:fs/promises"
import path from "node:path"

/**
 * @param {string} pattern
 * @returns {Promise<string[]>}
 */
export async function searchFiles(pattern) {
  const dir = path.dirname(pattern)
  const base = path.basename(pattern)

  const regex = new RegExp(
    "^" + base.replace(/\./g, "\\.").replace(/\*/g, ".*") + "$"
  )
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    return entries
      .filter((entry) => entry.isFile() && regex.test(entry.name))
      .map((entry) => path.join(dir, entry.name))
  } catch (e) {
    return []
  }
}
