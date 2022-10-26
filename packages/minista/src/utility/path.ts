import path from "node:path"
import fs from "fs-extra"

export function getHtmlPath(pathname: string) {
  let fileName = pathname.endsWith("/")
    ? path.join(pathname, "index.html")
    : pathname + ".html"
  fileName = fileName.replace(/^\//, "")
  return fileName
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
    const fileName = getHtmlPath(pathname)
    const filePath = path.dirname(fileName)
    return path.relative(filePath, path.join("./", assetPath))
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
