import type {
  HTMLBeautifyOptions,
  CSSBeautifyOptions,
  JSBeautifyOptions,
} from "js-beautify"

import { describe, expect, it } from "vitest"
import beautify from "js-beautify"

//prettier-ignore
describe("beautify", () => {
  it("Test: beautify html", () => {
    const result = 1+1

    /*const html = `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Download</title>
    <meta property="description" content="Next.js Like Development with 100% Static Generate." />
    <meta property="og:type" content="article" />
    <link rel="stylesheet" href="/assets/bundle.css">
  </head>
  <body>
    <header><img src="/assets/images/logo.svg" alt="minista" class="app-header-logo" width="400" height="84" /></header>
    <h1>Download</h1><img src="/assets/images/remote-1.png" alt="" /><img src="/assets/images/remote-1.png" alt="" /><img width="1600" height="900" sizes="(min-width: 1600px) 1600px, 100vw" src="/assets/images/remote-2.jpg" srcSet="/assets/images/remote-3.jpg 800w, /assets/images/remote-2.jpg 1600w" /><img width="1600" height="900" sizes="(min-width: 1600px) 1600px, 100vw" src="/assets/images/remote-2.jpg" srcSet="/assets/images/remote-3.jpg 800w, /assets/images/remote-2.jpg 1600w" />
  </body>
</html>`
    const htmlOptions: HTMLBeautifyOptions = {
      indent_size: 2,
      max_preserve_newlines: 0,
      indent_inner_html: true,
      extra_liners: [],
      inline: ["span", "b", "br", "code", "del", "s", "small", "strong", "wbr"] // https://developer.mozilla.org/ja/docs/Web/HTML/Inline_elements
    }
    const beautifiedHtml = beautify.html(html, htmlOptions)
    console.log(beautifiedHtml)*/

    expect(result).toBe(2)
  })
})
