import sharp from "sharp"

/**
 * @param {string} fullPath
 * @returns {Promise<{ width: number, height: number }>}
 */
export async function getSize(fullPath) {
  try {
    const { width = 0, height = 0 } = await sharp(fullPath).metadata()
    return { width, height }
  } catch (err) {
    console.error(`Failed to get image size for ${fullPath}`, err)
    return { width: 0, height: 0 }
  }
}
