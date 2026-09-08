import { loadDependency } from "../../../adapters/dependencies/sharp.js"

/**
 * @param {string} fullPath
 * @returns {Promise<{ width: number, height: number }>}
 */
export async function getSize(fullPath) {
  const { default: sharp } = await loadDependency()
  const { width = 0, height = 0 } = await sharp(fullPath).metadata()
  return { width, height }
}
