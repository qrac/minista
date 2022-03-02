import fs from "fs-extra"

export async function optimizeCommentOutStyleImport(entryPoints: string[]) {
  await Promise.all(
    entryPoints.map(async (entryPoint) => {
      const data = await fs.readFile(entryPoint, "utf-8")
      const reg = new RegExp('(import ".*(css|sass|scss)";)', "g")
      const result = data.replace(reg, "//$1")
      return fs.outputFile(entryPoint, result, "utf8")
    })
  )
}
