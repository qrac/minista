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
 * @param {{etag?: string, lastModified?: string}} [validators]
 * @returns {Promise<
 *   | {status: "not-modified", etag?: string, lastModified?: string}
 *   | {status: "downloaded", fileName: string, data: Buffer, etag?: string, lastModified?: string}
 * >}
 */
export async function getRemote(url, remoteName, remoteIndex, validators = {}) {
  let fileName = ""
  let extName = ""
  let contentType = ""

  const headers = {}
  if (validators.etag) headers["If-None-Match"] = validators.etag
  if (validators.lastModified) {
    headers["If-Modified-Since"] = validators.lastModified
  }
  const res = await fetch(url, {
    ...(Object.keys(headers).length > 0 ? { headers } : {}),
  })

  const etag = res.headers.get("etag") || validators.etag
  const lastModified = res.headers.get("last-modified") ||
    validators.lastModified
  if (res.status === 304) {
    return {
      status: "not-modified",
      ...(etag ? { etag } : {}),
      ...(lastModified ? { lastModified } : {}),
    }
  }

  if (!res.ok || !res.body) {
    throw new Error(
      `Remote image request failed with HTTP ${res.status}${
        res.statusText ? ` ${res.statusText}` : ""
      }.`,
    )
  }
  contentType = res.headers.get("content-type") || ""
  extName = extension(contentType) || getRemoteExt(url)
  if (extName.toLowerCase() === "jpeg") {
    extName = "jpg"
  }
  fileName = `${remoteName}${remoteIndex}.${extName}`

  const arrayBuffer = await res.arrayBuffer()
  const data = Buffer.from(arrayBuffer)
  return {
    status: "downloaded",
    fileName,
    data,
    ...(etag ? { etag } : {}),
    ...(lastModified ? { lastModified } : {}),
  }
}
