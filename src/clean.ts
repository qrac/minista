import fs from "fs-extra"
import pc from "picocolors"
import beautify from "js-beautify"
import type { HTMLBeautifyOptions } from "js-beautify"

export async function cleanHtmlPages(
  entryPoints: string[],
  options: HTMLBeautifyOptions = {
    indent_size: 2,
    max_preserve_newlines: 0,
  }
) {
  await Promise.all(
    entryPoints.map(async (entryPoint) => {
      await cleanHtmlPage(entryPoint, options)
    })
  )
}

export async function cleanHtmlPage(
  entryPoint: string,
  options?: HTMLBeautifyOptions
) {
  const html = await fs.readFile(entryPoint, "utf8")
  const result = beautify.html(html, options)

  await fs
    .outputFile(entryPoint, result)
    .then(() => {
      console.log(`${pc.bold(pc.blue("CLEAN"))} ${pc.bold(entryPoint)}`)
    })
    .catch((err) => {
      console.error(err)
    })
}
