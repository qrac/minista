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

export function noSlashStart(dir: string): string {
  const result = dir.startsWith("./")
    ? dir.replace(/^\.\//, "")
    : dir.startsWith("/")
    ? dir.replace(/^\//, "")
    : dir
  return result
}
