import fs from "node:fs"
import path from "node:path"

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
