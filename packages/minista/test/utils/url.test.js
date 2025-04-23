import { describe, it, expect } from "vitest"

import {
  getPageUrl,
  resolveParamUrl,
  extractUrls,
  getBasedAssetUrl,
} from "../../src/utils/url.js"

describe("getPageUrl", () => {
  it("srcパスをクリーンなルートに変換する", () => {
    const result = getPageUrl("/src/pages/blog/[slug].tsx", ["/src/pages"])
    expect(result).toBe("/blog/:slug")
  })

  it("indexファイルをルートパスに置き換える", () => {
    const result = getPageUrl("/src/pages/index.tsx", ["/src/pages"])
    expect(result).toBe("/")
  })

  it("相対パス（./src/pages）の indexファイルをルートパスに置き換える", () => {
    const result = getPageUrl("./src/pages/index.tsx", ["./src/pages"])
    expect(result).toBe("/")
  })

  it("親ディレクトリ相対パス（../src/pages）の indexファイルをルートパスに置き換える", () => {
    const result = getPageUrl("../src/pages/index.tsx", ["../src/pages"])
    expect(result).toBe("/")
  })

  it("restパラメータをサポートする", () => {
    const result = getPageUrl("/src/pages/docs/[...all].tsx", ["/src/pages"])
    expect(result).toBe("/docs/*")
  })
})

describe("resolveParamUrl", () => {
  it("単一のパラメータを置換する", () => {
    const result = resolveParamUrl("/blog/:slug", { slug: "hello-world" })
    expect(result).toBe("/blog/hello-world")
  })

  it("複数のパラメータを置換する", () => {
    const result = resolveParamUrl("/users/:userId/posts/:postId", {
      userId: "42",
      postId: "100",
    })
    expect(result).toBe("/users/42/posts/100")
  })

  it("同じパラメータを複数回置換する", () => {
    const result = resolveParamUrl("/:lang/about/:lang/contact", {
      lang: "en",
    })
    expect(result).toBe("/en/about/en/contact")
  })

  it("数値の値にも対応する", () => {
    const result = resolveParamUrl("/product/:id", { id: 123 })
    expect(result).toBe("/product/123")
  })

  it("プレースホルダーがない場合は同じパスを返す", () => {
    const result = resolveParamUrl("/about", { unused: "value" })
    expect(result).toBe("/about")
  })

  it("パスにパラメータが存在しない場合でも例外を投げない", () => {
    const result = resolveParamUrl("/blog/:slug", {})
    expect(result).toBe("/blog/:slug")
  })

  it("一部のパラメータのみ指定された場合は部分的に置換する", () => {
    const result = resolveParamUrl("/blog/:year/:slug", { year: "2024" })
    expect(result).toBe("/blog/2024/:slug")
  })
})

describe("extractUrls", () => {
  const html = `
    <img src="/images/a.jpg?ver=1#foo" />
    <img src="/images/b.jpg" />
    <img src="/images/b.jpg" />
    <source srcset="/img/c.jpg 1x, /img/d.jpg 2x" />
  `

  it("imgのsrcを抽出する", () => {
    const result = extractUrls(html, "img", "src")
    expect(result).toEqual(["/images/a.jpg", "/images/b.jpg"])
  })

  it("sourceのsrcsetを抽出する", () => {
    const result = extractUrls(html, "source", "srcset", "/img/")
    expect(result).toEqual(["/img/c.jpg", "/img/d.jpg"])
  })

  it("開始文字列が一致しない場合は無視する", () => {
    const result = extractUrls(html, "source", "srcset", "/no-match/")
    expect(result).toEqual([])
  })
})

describe("getBasedAssetUrl", () => {
  it("baseが './' のとき相対パスを返す", () => {
    const result = getBasedAssetUrl("./", "blog/index.html", "assets/logo.png")
    expect(result).toBe("../assets/logo.png")
  })

  it("baseが '/' のとき絶対URLを返す", () => {
    const result = getBasedAssetUrl("/", "blog/index.html", "assets/logo.png")
    expect(result).toBe("/assets/logo.png")
  })

  it("カスタムbaseを使ったURLを返す", () => {
    const result = getBasedAssetUrl(
      "/subdir/",
      "blog/index.html",
      "assets/logo.png"
    )
    expect(result).toBe("/subdir/assets/logo.png")
  })
})
