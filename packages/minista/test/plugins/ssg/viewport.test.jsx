import { describe, it, expect } from "vitest"

import { checkViewport } from "../../../src/plugins/ssg/utils/viewport.js"

describe("checkViewport", () => {
  it("<meta name='viewport'> が存在する場合は true を返す", () => {
    const tags = [
      <meta name="viewport" content="width=device-width" key="viewport" />,
    ]
    expect(checkViewport(tags)).toBe(true)
  })

  it("<meta の name が異なる場合は false を返す", () => {
    const tags = [<meta name="description" content="sample" key="desc" />]
    expect(checkViewport(tags)).toBe(false)
  })

  it("タグがない場合は false を返す", () => {
    expect(checkViewport([])).toBe(false)
  })

  it("他のタグタイプの場合は false を返す", () => {
    const tags = [<title>Test</title>]
    expect(checkViewport(tags)).toBe(false)
  })
})
