import { describe, expect, test } from "vitest"
import { NodeHtmlDocumentFactory } from "../../../src/adapters/html/index.js"
import { createNodeId } from "../../../src/core/index.js"
import { composeSsgPublicAssetDocument } from "../../../src/features/ssg/public-assets.js"
import { selectIslandContent } from "../../../src/features/island/index.js"
import { getBasedAssetUrl } from "../../../src/shared/url.js"

const files = new Set(["logo.svg", "app.js", "style.css", "font.woff2", "manual.pdf", "a,b.png", "日本語 image.png"])
/** @param {string} html */
const parse = (html) => new NodeHtmlDocumentFactory().parse({ pageId: createNodeId("page", "public"), html })

describe("SSG public assets", () => {
  test.each([
    ["/", "index.html", "/logo.svg"],
    ["/test/", "demos/index.html", "/test/logo.svg"],
    ["./", "index.html", "logo.svg"],
    ["./", "demos/index.html", "../logo.svg"],
    ["", "demos/deep/index.html", "../../logo.svg"],
    ["https://cdn.example.com/site/", "demos/index.html", "https://cdn.example.com/site/logo.svg"],
  ])("resolves %s from %s", (base, page, output) => {
    const document = parse('<img src="/logo.svg?v=1&amp;size=2#mark">')
    composeSsgPublicAssetDocument(document, files, { resolve: (file) => getBasedAssetUrl(base, page, file) })
    expect(document.select("img")[0].getAttribute("src")).toBe(`${output}?v=1&size=2#mark`)
  })

  test("rewrites asset attributes and existing public downloads without touching navigation or arbitrary attributes", () => {
    const document = parse(`<html><head>
      <link rel="stylesheet" href="/style.css"><script src=" /app.js?v=1 "></script>
      <link rel="preload" as="font" href="/font.woff2">
      <link rel="preload" as="image" imagesrcset="/logo.svg 1x, /a,b.png 2x">
      <meta property="og:image" content="/logo.svg"><meta name="TWITTER:IMAGE" content="/logo.svg">
      <meta name="description" content="/logo.svg">
    </head><body>
      <img src="/logo.svg"><input type="image" src="/logo.svg">
      <source src="/logo.svg"><video src="/logo.svg" poster="/logo.svg"></video>
      <audio src="/logo.svg"></audio><track src="/logo.svg"><embed src="/manual.pdf">
      <object data="/manual.pdf"></object><a href="/manual.pdf">Download</a>
      <svg><image href="/logo.svg"></image><use xlink:href="/logo.svg#icon"></use></svg>
      <a href="/about/">About</a><a href="/api/data">API</a><form action="/manual.pdf"></form>
      <div src="/logo.svg" data-src="/logo.svg" content="/logo.svg"></div>
    </body></html>`)
    composeSsgPublicAssetDocument(document, files, { resolve: (file) => `../${file}` })
    const html = document.serialize()
    for (const expected of [
      'href="../style.css"', 'src=" ../app.js?v=1 "', 'href="../font.woff2"',
      'imagesrcset="../logo.svg 1x, ../a,b.png 2x"', 'content="../logo.svg"',
      'src="../logo.svg"', 'poster="../logo.svg"', 'data="../manual.pdf"',
      'href="../manual.pdf"', 'xlink:href="../logo.svg#icon"',
      'name="description" content="/logo.svg"', 'href="/about/"', 'href="/api/data"',
      'action="/manual.pdf"', '<div src="/logo.svg" data-src="/logo.svg" content="/logo.svg">',
    ]) expect(html).toContain(expected)
  })

  test("preserves URL boundaries, encoding and srcset formatting", () => {
    const document = parse(`<img srcset="data:image/png;base64,AAAA, /logo.svg\t1x,\n/a,b.png?x=a,b#icon 2x, //cdn.test/logo.svg 3x">
      <img src="/日本語%20image.png"><img src="/bad%ZZ.png"><img src="/logo.svg-other">
      <img src="https://example.com/logo.svg"><img src="./logo.svg"><img src="#logo.svg">
      <img src="/test/logo.svg"><img src="/missing.png">`)
    composeSsgPublicAssetDocument(document, files, { resolve: (file) => `/test/${file}` })
    const html = document.serialize()
    expect(html).toContain('srcset="data:image/png;base64,AAAA, /test/logo.svg\t1x,\n/test/a,b.png?x=a,b#icon 2x, //cdn.test/logo.svg 3x"')
    expect(html).toContain('src="/test/日本語%20image.png"')
    for (const url of ["/bad%ZZ.png", "/logo.svg-other", "https://example.com/logo.svg", "./logo.svg", "#logo.svg", "/missing.png"]) {
      expect(html).toContain(`src="${url}"`)
    }
    expect(html).not.toContain("/test/test/")
  })

  test("rewrites inline CSS url() while preserving comments, strings and script contents", () => {
    const document = parse(`<style>
      /* url(/logo.svg) */
      .hero { background: url( '/logo.svg?v=1#mark' ), URL(/a,b.png); content: "url(/logo.svg)" }
      .escaped { background: url('/lo\\67o.svg') }
    </style><div style="background:url(&quot;/logo.svg&quot;);--text:'url(/logo.svg)'"></div>
    <script>const path = "/logo.svg"</script>`)
    composeSsgPublicAssetDocument(document, files, { resolve: (file) => `../${file}` })
    const css = document.select("style")[0].innerHtml
    expect(css).toContain("url( '../logo.svg?v=1#mark' ), URL(../a,b.png)")
    expect(css).toContain('/* url(/logo.svg) */')
    expect(css).toContain('content: "url(/logo.svg)"')
    expect(css).toContain("url('/lo\\67o.svg')")
    expect(document.select("div")[0].getAttribute("style")).toBe('background:url("../logo.svg");--text:\'url(/logo.svg)\'')
    expect(document.select("script")[0].innerHtml).toBe('const path = "/logo.svg"')
  })

  test.each(["", "custom"])("preserves Island contents with prefix %s", (rootAttrName) => {
    const marker = `data-${rootAttrName ? `${rootAttrName}-` : ""}client-snippet`
    const document = parse(`<img src="/logo.svg"><div ${marker}="snippet"><section>
      <img src="/logo.svg"><a href="/manual.pdf">Download</a><style>.x{background:url(/logo.svg)}</style>
    </section></div>`)
    const excluded = new Set(selectIslandContent(document, /** @type {any} */ ({ rootAttrName })))
    composeSsgPublicAssetDocument(document, files, { resolve: (file) => `../${file}` }, excluded)
    expect(document.select("img").map((el) => el.getAttribute("src"))).toEqual(["../logo.svg", "/logo.svg"])
    expect(document.select("a")[0].getAttribute("href")).toBe("/manual.pdf")
    expect(document.select("style")[0].innerHtml).toContain("url(/logo.svg)")
  })
})
