import path from "node:path"
import { parse as parseUrl } from "node:url"

export function getRemoteFileName(url: string) {
  const pathname = parseUrl(url).pathname || ""
  const parsedName = path.parse(pathname)
  const fileName = parsedName.base
  const hasExt = parsedName.ext

  return hasExt ? fileName : ""
}

export function getRemoteFileExtName(url: string) {
  const pathname = parseUrl(url).pathname || ""
  const parsedName = path.parse(pathname)

  return parsedName.ext.replace(/^\./, "") || ""
}
