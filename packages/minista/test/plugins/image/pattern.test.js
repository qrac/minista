import { describe, it, expect } from "vitest"
import { getPatternName } from "../../../src/plugins/image/utils/pattern.js"

describe("getPatternName", () => {
  it("通常画像では [name]-[width]x[height].format が返る", () => {
    const result = getPatternName(
      "image.jpg",
      "[name]-[width]x[height]",
      "remote-[index]",
      300,
      200,
      "webp"
    )
    expect(result).toBe("image-300x200.webp")
  })

  it("リモート画像 (__r12) では remote-[index]-[width]x[height].format が返る", () => {
    const result = getPatternName(
      "__r12.jpg",
      "[name]-[width]x[height]",
      "remote-[index]",
      400,
      300,
      "png"
    )
    expect(result).toBe("remote-12-400x300.png")
  })

  it("カスタム outName テンプレートを使える", () => {
    const result = getPatternName(
      "photo.png",
      "[name]_[width]",
      "remote-[index]",
      150,
      100,
      "avif"
    )
    expect(result).toBe("photo_150.avif")
  })

  it("カスタム remoteName テンプレートを使える", () => {
    const result = getPatternName(
      "__r7.gif",
      "[name]-[width]",
      "cdn-image-[index]",
      800,
      600,
      "jpg"
    )
    expect(result).toBe("cdn-image-7-800.jpg")
  })

  it("プレースホルダが [name] のみの場合にも対応", () => {
    const result = getPatternName(
      "avatar.svg",
      "[name]",
      "remote-[index]",
      64,
      64,
      "png"
    )
    expect(result).toBe("avatar.png")
  })
})
