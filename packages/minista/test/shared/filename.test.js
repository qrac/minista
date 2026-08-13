import { describe, it, expect } from "vitest"

import {
  getHtmlFileName,
  getHtmlPageUrl,
} from "../../src/shared/filename.js"

describe("getHtmlFileName", () => {
  it("シンプルなパスを変換する", () => {
    expect(getHtmlFileName("/about")).toBe("about.html")
    expect(getHtmlFileName("/blog")).toBe("blog.html")
  })

  it("末尾にスラッシュのあるディレクトリパスを変換する", () => {
    expect(getHtmlFileName("/blog/")).toBe("blog/index.html")
    expect(getHtmlFileName("/docs/guide/")).toBe("docs/guide/index.html")
  })

  it("ルートパスを正しく処理する", () => {
    expect(getHtmlFileName("/")).toBe("index.html")
  })

  it("先頭のスラッシュのみを削除する", () => {
    expect(getHtmlFileName("/foo/bar")).toBe("foo/bar.html")
  })
})

describe("getHtmlPageUrl", () => {
  it("converts emitted HTML file names back to page URLs", () => {
    expect(getHtmlPageUrl("index.html")).toBe("/")
    expect(getHtmlPageUrl("docs/index.html")).toBe("/docs/")
    expect(getHtmlPageUrl("about.html")).toBe("/about")
  })
})
