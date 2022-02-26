import fs from "fs-extra"

export async function optimizeCommentOutStyleImport(entryPoints: string[]) {
  await Promise.all(
    entryPoints.map(async (entryPoint) => {
      fs.readFile(entryPoint, "utf8", function (err, data) {
        if (err) {
          return console.log(err)
        }
        const reg = new RegExp('(import ".*(css|sass|scss)";)', "g")
        const result = data.replace(reg, "//$1")

        fs.outputFile(entryPoint, result, "utf8", function (err) {
          if (err) return console.log(err)
        })
      })
    })
  )
}
