import path from "path"

export function slashEnd(dir: string): string {
  if (dir === "") {
    return ""
  } else if (dir === "/") {
    return "/"
  } else if (dir.endsWith("/")) {
    return dir
  } else {
    return dir + "/"
  }
}

export function noSlashEnd(dir: string): string {
  if (dir === "") {
    return ""
  } else if (dir === "/") {
    return ""
  } else if (dir.endsWith("/")) {
    return dir.slice(0, -1)
  } else {
    return dir
  }
}

export function getFilename(fullPath: string): string {
  const parsedFullPath = path.parse(fullPath)
  return parsedFullPath.name
}

export function getFilenameObject(fullPaths: string[]) {
  const list = fullPaths.map((item) => [getFilename(item), item])
  const object = Object.fromEntries(list)
  return object
}

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

export function reactStylesToString(styles: React.CSSProperties) {
  const result = Object.entries(styles)
    .map(([key, value]) => {
      const reg = new RegExp(/[A-Z]/g)
      const cssKey = key.replace(reg, (v) => `-${v.toLowerCase()}`)
      const cssValue = value
      return `${cssKey}:${cssValue};`
    })
    .join("")
  return result
}
