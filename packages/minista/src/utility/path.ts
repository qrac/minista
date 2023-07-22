import path from "node:path"
import fs from "fs-extra"

export function getHtmlPath(pathname: string) {
  let fileName = pathname.endsWith("/")
    ? path.join(pathname, "index.html")
    : pathname + ".html"
  fileName = fileName.replace(/^\//, "")
  return fileName
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
  if (!url) return false

  try {
    const { protocol } = new URL(url)
    if (protocol) {
      return false
    }
  } catch (_) {}

  const filePath = path.join(root, url)
  return fs.existsSync(filePath)
}
