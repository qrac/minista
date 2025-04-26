import { describe, it, expect } from "vitest"

import { checkCharset } from "../../../src/plugins/ssg/utils/charset.js"

describe("checkCharset", () => {
  it("<meta charSet が存在する場合は true を返す", () => {
    const tags = [<meta charSet="utf-8" key="charset" />]
    expect(checkCharset(tags)).toBe(true)
  })

  it("<meta に charSet がない場合は false を返す", () => {
    const tags = [<meta name="viewport" content="width=device-width" />]
    expect(checkCharset(tags)).toBe(false)
  })

  it("タグがない場合は false を返す", () => {
    expect(checkCharset([])).toBe(false)
  })

  it("他のタグの場合は false を返す", () => {
    const tags = [
      <title>Test</title>,
      <link rel="stylesheet" href="/style.css" />,
    ]
    expect(checkCharset(tags)).toBe(false)
  })
})
