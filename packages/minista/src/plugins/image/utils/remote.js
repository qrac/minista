import path from "node:path"
import { extension } from "mime-types"

/**
 * @param {string} url
 * @returns {string}
 */
export function getRemoteExt(url) {
  const pathname = new URL(url).pathname || ""
  const { ext } = path.parse(pathname)
  return ext.replace(/^\./, "") || ""
}

/**
 * @param {string} url
 * @param {string} remoteName
 * @param {number} remoteIndex
 * @returns {Promise<{ fileName: string, data: Buffer }|undefined>}
 */
export async function getRemote(url, remoteName, remoteIndex) {
  let fileName = ""
  let extName = ""
  let contentType = ""

  try {
    const res = await fetch(url)

    if (!res.ok || !res.body) {
      console.error(res.statusText)
      return
    }
    contentType = res.headers.get("content-type") || ""
    extName = extension(contentType) || getRemoteExt(url)
    if (extName.toLowerCase() === "jpeg") {
      extName = "jpg"
    }
    fileName = `${remoteName}${remoteIndex}.${extName}`

    const arrayBuffer = await res.arrayBuffer()
    const data = Buffer.from(arrayBuffer)
    return { fileName, data }
  } catch (err) {
    console.error(err)
    return
  }
}
