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

export function getBasedAssetPath({
  base,
  pathname,
  assetPath,
}: {
  base: string
  pathname: string
  assetPath: string
}) {
  if (base === "" || base === "./") {
    return getRelativeAssetPath({ pathname, assetPath })
  }
  return path.join(base, assetPath)
}

export function getNodeModulesPath(root: string): string {
  if (fs.existsSync(path.join(root, "package.json"))) {
    return path.join(root, "node_modules")
  } else {
    return path.join(process.cwd(), "node_modules")
  }
}

export function resolveRelativeImagePath({
  pathname,
  replaceTarget,
  assetPath,
}: {
  pathname: string
  replaceTarget: string
  assetPath: string
}) {
  let resolvedPath = assetPath.replace(/\n/, "").trim()

  if (!resolvedPath.includes(",") && resolvedPath.startsWith(replaceTarget)) {
    return getRelativeAssetPath({ pathname, assetPath: resolvedPath })
  }
  if (!resolvedPath.includes(",")) {
    return resolvedPath
  }

  resolvedPath = resolvedPath
    .split(",")
    .map((s) => s.trim())
    .map((s) => {
      let [url, density] = s.split(/\s+/)

      if (url.startsWith(replaceTarget)) {
        url = getRelativeAssetPath({ pathname, assetPath: url })
      }
      return `${url} ${density}`
    })
    .join(", ")
  return resolvedPath
}

export function isLocalPath(root: string, url: string) {
  const isAbsolute = parseUrl(url).protocol

  if (!url || isAbsolute) {
    return false
  }
  const filePath = path.join(root, url)
  return fs.existsSync(filePath)
}
