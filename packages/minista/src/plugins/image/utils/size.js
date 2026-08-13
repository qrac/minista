import sharp from "sharp"

/**
 * @param {string} fullPath
 * @returns {Promise<{ width: number, height: number }>}
 */
export async function getSize(fullPath) {
  const { width = 0, height = 0 } = await sharp(fullPath).metadata()
  return { width, height }
}
