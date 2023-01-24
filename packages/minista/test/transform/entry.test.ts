import { describe, expect, it } from "vitest"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { parse as parseHtml } from "node-html-parser"

import { resolveConfig } from "../../src/config"
import { transformDynamicEntries } from "../../src/transform/entry"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

describe("transformDynamicEntries", () => {
  it("Default", async () => {
    const config = await resolveConfig({})
    const resolvedRoot = config.sub.resolvedRoot

    const pathname = "/"
    const cssPath = path.join(__dirname, "../_data/index.css")
    const jsPath = path.join(__dirname, "../_data/index.ts")
    const relativeCssPath = path.relative(resolvedRoot, cssPath)
    const relativeJsPath = path.relative(resolvedRoot, jsPath)

    const html = `<link rel="stylesheet" href="/${relativeCssPath}">
<script type="module" src="/${relativeJsPath}"></script>`
    const parsedHtml = parseHtml(html)

    const result = transformDynamicEntries({
      parsedHtml,
      pathname,
      config,
      linkEntries: {},
      scriptEntries: {},
    })
    expect(result.toString())
      .toEqual(`<link rel="stylesheet" href="/assets/index.css">
<script type="module" src="/assets/index.js"></script>`)
  })
})
