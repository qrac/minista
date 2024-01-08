import type { OutputAsset } from "rollup"
import fs from "node:fs"
import path from "node:path"

export function getAttrRootPaths(html: string, tag: string, attr: string) {
  const regex = new RegExp(`<${tag}[^>]*?${attr}="(/[^"]*)"`, "g")

  let match: RegExpExecArray | null
  let rootPaths = []

  while ((match = regex.exec(html)) !== null) {
    rootPaths.push(match[1])
  }
  return rootPaths
}

export function filterExistEntries(
  obj: { [key: string]: string[] },
  rootDir: string
) {
  return Object.keys(obj).reduce((acc, key) => {
    const filePath = path.join(rootDir, key)

    if (fs.existsSync(filePath)) {
      acc[key] = obj[key]
    }
    return acc
  }, {} as { [key: string]: string[] })
}

export function getObjectKeySuffix(
  obj: { [key: string]: any },
  keyName: string,
  start: number
) {
  if (!obj.hasOwnProperty(keyName)) {
    return ""
  }
  let suffix = start
  while (obj.hasOwnProperty(`${keyName}-${suffix}`)) {
    suffix++
  }
  return `-${suffix}`
}

export function getChunkCssName(
  assetCss: [string, OutputAsset][],
  jsName: string
) {
  const targetAssetCss = assetCss.find(
    ([, item]) => item.name === jsName + ".css"
  )
  return targetAssetCss ? targetAssetCss[1].fileName : ""
}

export function getReplaceTagRegex(tag: string, attr: string) {
  return new RegExp(`(<${tag}[^>]*?${attr}=")[^"]*(")`, "g")
}
