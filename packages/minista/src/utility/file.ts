import fs from "fs-extra"
import fg from "fast-glob"

export async function readFiles(globPath: string) {
  const items = await fg(globPath)

  if (!items.length) {
    return []
  }
  return items.map((item) => {
    return fs.readFileSync(item, { encoding: "utf8" })
  })
}
