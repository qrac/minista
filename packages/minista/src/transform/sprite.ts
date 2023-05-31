import type { SvgstoreAddOptions } from "@qrac/svgstore"
import path from "node:path"
import fs from "fs-extra"
import svgstore from "@qrac/svgstore"

export function transformSprite({
  svgFiles,
  options,
}: {
  svgFiles: string[]
  options: SvgstoreAddOptions
}) {
  const sprites = svgstore()

  for (const svgFile of svgFiles) {
    const svgId = path.parse(svgFile).name
    const code = fs.readFileSync(svgFile, { encoding: "utf8" })
    sprites.add(svgId, code, options)
  }
  return sprites
    .toString({ inline: true })
    .replace(
      `<svg>`,
      `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">`
    )
}
