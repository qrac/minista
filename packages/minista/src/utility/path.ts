import path from "node:path"
import { parse as parseUrl } from "node:url"
import fs from "fs-extra"

export function getHtmlPath(pathname: string) {
  let fileName = pathname.endsWith("/")
    ? path.join(pathname, "index.html")
    : pathname + ".html"
  fileName = fileName.replace(/^\//, "")
  return fileName
}

export function getRelativeAssetPath({
  pathname,
  assetPath,
}: {
  pathname: string
  assetPath: string
}) {
  const pagePath = path.dirname(getHtmlPath(pathname))
  return path.relative(pagePath, path.join("./", assetPath))
}

export function getNodeModulesPath(root: string): string {
  if (fs.existsSync(path.join(root, "package.json"))) {
    return path.join(root, "node_modules")
  } else {
    return path.join(process.cwd(), "node_modules")
  }
}

export function getUniquePaths(paths: string[], excludes?: string[]) {
  const uniquePaths = [...new Set(paths)].sort()

  if (excludes) {
    return uniquePaths.filter((url) => !excludes.includes(url))
  } else {
    return uniquePaths
  }
}

export function isLocalPath(root: string, url: string) {
  const isAbsolute = parseUrl(url).protocol

  if (!url || isAbsolute) {
    return false
  }
  const filePath = path.join(root, url)
  return fs.existsSync(filePath)
}
