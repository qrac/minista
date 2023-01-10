import { describe, expect, it } from "vitest"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { readFiles } from "../../src/utility/file"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

describe("readFiles", () => {
  it("File does not exist", async () => {
    const globPath = path.join(__dirname, "../_data/unread.txt")
    const relativePath = path.relative(".", globPath)
    const result = await readFiles(relativePath)

    //console.log(result)
    expect(result).toEqual([])
  })

  it("File exists", async () => {
    const globPath = path.join(__dirname, "../_data/**/*.txt")
    const relativePath = path.relative(".", globPath)
    const result = await readFiles(relativePath)

    //console.log(result)
    expect(result).toEqual(["hello", "world"])
  })
})
