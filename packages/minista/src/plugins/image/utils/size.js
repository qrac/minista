import { imageSizeFromFile } from "image-size/fromFile"

/**
 * @param {string} fullPath
 * @returns {Promise<{ width: number, height: number }>}
 */
export async function getSize(fullPath) {
  try {
    const { width = 0, height = 0 } = (await imageSizeFromFile(fullPath)) || {}
    return { width, height }
  } catch (err) {
    console.error(`Failed to get image size for ${fullPath}`, err)
    return { width: 0, height: 0 }
  }
}
