import { describe, it, expect } from "vitest"

import { resolveAspect } from "../../../src/plugins/image/utils/aspect.js"

describe("resolveAspect", () => {
  it('アスペクト比が有効な場合（例: "16:9"）は入力をそのまま返す', () => {
    expect(resolveAspect("16:9")).toBe("16:9")
  })

  it('アスペクト比に小数を含む場合（例: "4.5:3.2"）は入力をそのまま返す', () => {
    expect(resolveAspect("4.5:3.2")).toBe("4.5:3.2")
  })

  it("文字を含む無効なアスペクト比では undefined を返す", () => {
    expect(resolveAspect("abc:def")).toBeUndefined()
  })

  it("コロンがない場合は undefined を返す", () => {
    expect(resolveAspect("169")).toBeUndefined()
  })

  it("空文字の場合は undefined を返す", () => {
    expect(resolveAspect("")).toBeUndefined()
  })

  it("数値以外の値の場合は undefined を返す", () => {
    expect(resolveAspect("a:b")).toBeUndefined()
  })

  it("比の一方だけの場合は undefined を返す", () => {
    expect(resolveAspect("16:")).toBeUndefined()
    expect(resolveAspect(":9")).toBeUndefined()
  })
})
