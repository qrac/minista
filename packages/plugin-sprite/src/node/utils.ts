import fs from "node:fs"
import path from "node:path"
import fg from "fast-glob"
import { deepmerge } from "deepmerge-ts"
import SVGSpriter from "svg-sprite"
import { parse as parseHtml } from "node-html-parser"
import Vinyl from "vinyl"

import type { SvgSpriteConfig } from "../@types/node.js"

export async function generateSprite(
  srcDir: string,
  filePath: string,
  config?: SvgSpriteConfig
) {
  const svgFiles = await fg(path.join(srcDir, "**/*.svg"))

  if (!svgFiles.length) return

  const svgSpriteConfig: SvgSpriteConfig = deepmerge(
    {
      mode: {
        symbol: {
          dest: ".",
          sprite: filePath,
        },
      },
      svg: {
        xmlDeclaration: false,
      },
      shape: {
        id: {
          separator: "",
        },
      },
    },
    config ?? {}
  )
  const spriter = new SVGSpriter(svgSpriteConfig)

  for (const svgFile of svgFiles) {
    const code = fs.readFileSync(svgFile, { encoding: "utf8" })

    if (code.includes("<symbol")) {
      const parsedCode = parseHtml(code)
      const symbols = parsedCode.querySelectorAll("symbol")

      if (!symbols.length) continue

      for (const symbol of symbols) {
        const id = symbol.getAttribute("id")
        const viewBox = symbol.getAttribute("viewBox")
        const html = symbol.innerHTML

        if (!id || !viewBox || !html) continue

        const content = `<svg viewBox="${viewBox}">${html}</svg>`
        const vinylPath = path.join(path.dirname(svgFile), id + ".svg")
        const vinylFile = new Vinyl({
          path: vinylPath,
          contents: Buffer.from(content),
        })
        spriter.add(vinylFile, null, "")
      }
      continue
    }
    spriter.add(svgFile, null, code)
  }
  const { result } = await spriter.compileAsync()

  await fs.promises.writeFile(filePath, result.symbol.sprite.contents, "utf8")
}
