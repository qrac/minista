import { describe, it, expect } from "vitest"

import { getRemoteExt } from "../../../src/plugins/image/utils/remote.js"

describe("getRemoteExt", () => {
  it("拡張子があるURLからドットなしで返す", () => {
    expect(getRemoteExt("https://example.com/image.jpg")).toBe("jpg")
    expect(getRemoteExt("https://example.com/photo.jpeg")).toBe("jpeg")
    expect(getRemoteExt("https://example.com/archive.tar.gz")).toBe("gz")
  })

  it("拡張子がない場合は空文字を返す", () => {
    expect(getRemoteExt("https://example.com/path")).toBe("")
    expect(getRemoteExt("https://example.com/path/")).toBe("")
  })

  it("クエリ文字列やハッシュは無視する", () => {
    expect(getRemoteExt("https://example.com/pic.png?size=large")).toBe("png")
    expect(getRemoteExt("https://example.com/pic.png#section")).toBe("png")
  })

  it("大文字の拡張子もそのまま返す", () => {
    expect(getRemoteExt("https://example.com/PHOTO.JPG")).toBe("JPG")
  })

  it("階層化されたパスでも拡張子を取得できる", () => {
    expect(getRemoteExt("https://example.com/nested/path/file.svg")).toBe("svg")
  })

  it("空文字列や無効なURLは例外を投げる", () => {
    expect(() => getRemoteExt("")).toThrow()
    expect(() => getRemoteExt("not a url")).toThrow()
  })
})
