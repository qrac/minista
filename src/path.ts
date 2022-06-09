import fs from "fs-extra"
import fg from "fast-glob"
import path from "path"

import { slashEnd } from "./utils.js"

export function getFilePath(targetDir: string, fileName: string, ext: string) {
  const filePath = `${targetDir}/${fileName}.${ext}`
  const file = fs.existsSync(path.resolve(filePath))
    ? path.resolve(filePath)
    : ""
  return file
}

export async function getFilePaths(targetDir: string, exts: string | string[]) {
  const strExt = typeof exts === "string" ? exts : exts.join("|")
  const globPattern = `${targetDir}/**/*.+(${strExt})`
  const files = await fg(globPattern, { extglob: true })
  return files
}

export async function getFilterFilePaths({
  targetDir,
  include,
  exclude,
  exts,
}: {
  targetDir?: string
  include: string[]
  exclude?: string[]
  exts?: string | string[]
}) {
  const fixDir = targetDir ? slashEnd(targetDir) : ""
  const fixExt = exts
    ? typeof exts === "string"
      ? `.${exts.replace(/^\./, "")}`
      : `.+(${exts.map((ext) => ext.replace(/^\./, "")).join("|")})`
    : ""
  const includes = include.map((str) => `${fixDir}${str}${fixExt}`)
  const excludes = exclude
    ? exclude.map((str) => `!${fixDir}${str}${fixExt}`)
    : []
  const globPattern = [includes, excludes].flat()
  const files = await fg(globPattern, { extglob: fixExt ? true : false })
  return files
}

export async function getSameFilePaths(
  targetDir: string,
  fileName: string,
  exts: string | string[]
) {
  const strExt = typeof exts === "string" ? exts : exts.join("|")
  const globPattern = `${targetDir}/${fileName}.+(${strExt})`
  const files = await fg(globPattern, { extglob: true })
  return files
}
