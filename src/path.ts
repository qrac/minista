import fs from "fs-extra"
import fg from "fast-glob"
import path from "path"

export function getFilePath(
  targetDir: string,
  fileName: string,
  extension: string
) {
  const filePath = `${targetDir}/${fileName}.${extension}`
  const file = fs.existsSync(path.resolve(filePath))
    ? path.resolve(filePath)
    : ""
  return file
}

export async function getFilePaths(
  targetDir: string,
  extensions: string | string[]
) {
  const strExtension =
    typeof extensions === "string" ? extensions : extensions.join("|")
  const globPattern = `${targetDir}/**/*.+(${strExtension})`
  const files = await fg(globPattern, { extglob: true })
  return files
}

export async function getSameFilePaths(
  targetDir: string,
  fileName: string,
  extensions: string | string[]
) {
  const strExtension =
    typeof extensions === "string" ? extensions : extensions.join("|")
  const globPattern = `${targetDir}/${fileName}.+(${strExtension})`
  const files = await fg(globPattern, { extglob: true })
  return files
}
