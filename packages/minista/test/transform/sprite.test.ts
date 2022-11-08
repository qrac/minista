import { describe, expect, it } from "vitest"

import path from "node:path"
import { fileURLToPath } from "node:url"

import { transformSprite } from "../../src/transform/sprite"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

describe("transformSprite", () => {
  it("Default", async () => {
    const svgFile = path.join(__dirname, "../_data/plus.svg")
    const options = {
      cleanSymbols: ["fill", "stroke", "stroke-linejoin", "stroke-width"],
    }
    const result = transformSprite({ svgFiles: [svgFile], options })

    //console.log(result)
    expect(result).toEqual(
      `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><defs/><symbol id="plus" viewBox="0 0 16 16">
  <polygon fill-rule="evenodd" points="9 7 14 7 14 9 9 9 9 14 7 14 7 9 2 9 2 7 7 7 7 2 9 2"/>
</symbol></svg>`
    )
  })
})
