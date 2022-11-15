import { describe, expect, it } from "vitest"

import iconv from "iconv-lite"

import { transformEncode } from "../../src/transform/encode"

describe("transformEncode", () => {
  it("Default", () => {
    const result = transformEncode("<h1>日本語の文字</h1>", "UTF-8")

    //console.log(result)
    expect(result).toEqual(Buffer.from("<h1>日本語の文字</h1>"))
  })

  it("Shift_JIS", () => {
    const result = transformEncode("<h1>日本語の文字</h1>", "Shift_JIS")

    //console.log(result)
    expect(result).toEqual(iconv.encode("<h1>日本語の文字</h1>", "Shift_JIS"))
  })
})
