import path from "node:path"

export function getFileName(filePath: string): string {
  const parsedFilePath = path.parse(filePath)
  return parsedFilePath.name
}

export function getFileNameObject(filePaths: string[]) {
  const list = filePaths.map((item) => [getFileName(item), item])
  const object = Object.fromEntries(list) as { [key: string]: string }
  return object
}

export function getFileExt(filePath: string): string {
  const fileExtName = path.extname(filePath)
  const fileExt = fileExtName ? fileExtName.slice(1) : ""
  return fileExt
}
