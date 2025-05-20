import { describe, it, expect } from "vitest"

import { pathToId, idToPath } from "../../src/shared/path.js"

describe("pathToId and idToPath", () => {
  const testCases = [
    "/index.html",
    "src/pages/about.tsx",
    "C:\\Users\\Keita\\project\\main.js",
    "./assets/images/logo.png",
    "",
    "/foo?bar#hash",
  ]

  it("パスをBase64に変換し、復元しても元と同じになる", () => {
    for (const original of testCases) {
      const encoded = pathToId(original)
      const decoded = idToPath(encoded)

      expect(decoded).toBe(original)
    }
  })

  it("有効なBase64文字列を生成する", () => {
    const result = pathToId("hello/world.js")
    expect(() => Buffer.from(result, "base64")).not.toThrow()
  })

  it("空文字列を正しく処理する", () => {
    const encoded = pathToId("")
    const decoded = idToPath(encoded)
    expect(encoded).toBe("")
    expect(decoded).toBe("")
  })
})
