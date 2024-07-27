import fs from "node:fs"
import path from "node:path"

export function checkDeno() {
  return typeof (globalThis as any).Deno !== "undefined"
}

export function getCwd(isDeno: boolean) {
  return isDeno ? ((globalThis as any).Deno.cwd() as string) : process.cwd()
}

export function getRootDir(cwd: string, root: string) {
  return root === cwd ? cwd : path.join(cwd, root || "")
}

export function getPluginName(names: string[]) {
  return "vite-plugin:minista-" + names.join("-")
}

export function getTempName(names: string[]) {
  return "__minista_" + names.join("_")
}

export function getTempDir(cwd: string, rootDir: string) {
  const hasRootPkg = fs.existsSync(path.join(rootDir, "package.json"))
  const pkgDir = hasRootPkg ? rootDir : cwd
  return path.join(pkgDir, "node_modules", ".minista")
}

export function getPagePath(srcPath: string, srcBases?: string[]) {
  let pagePath = srcPath

  if (srcBases && srcBases.length > 0) {
    srcBases.forEach((srcBase) => {
      pagePath = pagePath.replace(new RegExp(`^${srcBase}`), "/")
    })
  }
  return pagePath
    .replace(/index\.[^\/]+?$|(\.[^\/.]+)$/g, "")
    .replace(/\[\.{3}.+\]/, "*")
    .replace(/\[(.+)\]/, ":$1")
    .replace(/^.\/+/, "/")
}

export function getHtmlPath(pagePath: string) {
  return (
    pagePath.endsWith("/")
      ? path.join(pagePath, "index.html")
      : pagePath + ".html"
  ).replace(/^\//, "")
}

export function getBasedAssetPath(
  base: string,
  htmlPath: string,
  assetPath: string
) {
  if (base === "./") {
    return path.relative(path.dirname(htmlPath), assetPath)
  }
  return base.replace(/\/$/, "") + "/" + assetPath
}

export function getAttrPaths(
  html: string,
  tag: string,
  attr: string,
  start?: string
) {
  const regex = new RegExp(`<${tag}[^>]*?${attr}="([^"]*?)"`, "gs")

  let match: RegExpExecArray | null
  let rootPaths: string[] = []

  while ((match = regex.exec(html)) !== null) {
    const matchPath = match[1]
    const pathList = matchPath.split(",")

    for (const pathItem of pathList) {
      let item: string | undefined
      item = pathItem.trim()
      item = item.split("#")[0]
      item = item.split("\\?")[0]
      item = item.match(/^(.*\.\w+)/)?.[1]

      if (!item) continue

      if (start) {
        if (item.startsWith(start)) {
          rootPaths.push(item)
        }
      } else {
        rootPaths.push(item)
      }
    }
  }
  rootPaths = [...new Set(rootPaths)]
  rootPaths.sort()
  return rootPaths
}
