import path from "path"

export function valueToStringObject(obj: {} | any | undefined) {
  if (obj) {
    Object.keys(obj).forEach((key) => {
      if (typeof obj[key] === "object") {
        return valueToStringObject(obj[key])
      }
      obj[key] = "" + obj[key]
    })
  }
  return obj
}

export function sortObject(obj: {} | undefined) {
  const sorted = obj && Object.entries(obj).sort()

  if (sorted && sorted.length > 0) {
    for (let index in sorted) {
      const val = sorted[index][1]
      if (val && typeof val === "object") {
        sorted[index][1] = sortObject(val)
      }
    }
  }
  return sorted
}

export function getFilename(fullPath: string) {
  const parsedFullPath = path.parse(fullPath)
  return parsedFullPath.name
}

export function getFilenameObject(fullPaths: string[]) {
  const list = fullPaths.map((item) => ({ [getFilename(item)]: item }))
  const object = { ...list }
  return object
}
