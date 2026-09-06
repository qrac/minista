import { describe, expect, test } from "vitest"

import { createViteMdxTransformer } from "../../../src/adapters/vite/mdx-transform.js"

describe("Vite MDX transformer", () => {
  test("ignores unrelated modules and explicit asset queries", async () => {
    const transformer = createViteMdxTransformer({})

    await expect(transformer.transform("export default 1", "/page.jsx"))
      .resolves.toBeUndefined()
    await expect(transformer.transform("# Raw", "/page.mdx?raw"))
      .resolves.toBeUndefined()
  })

  test("compiles Markdown and MDX after a matching module is requested", async () => {
    const transformer = createViteMdxTransformer({})
    transformer.setDevelopment(false)

    const markdown = await transformer.transform(
      "---\ntitle: About\n---\n# About",
      "/about.md",
    )
    const mdx = await transformer.transform(
      "export const answer = 42\n\n# MDX",
      "/index.mdx",
    )

    expect(markdown?.code).toContain("export const metadata")
    expect(markdown?.code).toContain("function MDXContent")
    expect(mdx?.code).toContain("export const answer = 42")
    expect(mdx?.code).toContain("function MDXContent")
  })

  test("parses YAML frontmatter with the internal plugin", async () => {
    const transformer = createViteMdxTransformer({})
    const result = await transformer.transform(
      "---\ntitle: About\ntags:\n  - docs\ndraft: false\n---\n# About",
      "/about.mdx",
    )

    expect(result?.code).toContain("export const metadata")
    expect(result?.code).toContain('"title": "About"')
    expect(result?.code).toContain('"tags": ["docs"]')
    expect(result?.code).toContain('"draft": false')
  })

  test("parses TOML frontmatter with the internal plugin", async () => {
    const transformer = createViteMdxTransformer({})
    const result = await transformer.transform(
      "+++\ntitle = \"About\"\ntags = [\"docs\", \"toml\"]\ndraft = false\npublished = 1979-05-27T07:32:00Z\nlarge = 9007199254740993\n+++\n# About",
      "/about.mdx",
    )

    expect(result?.code).toContain("export const metadata")
    expect(result?.code).toContain('"title": "About"')
    expect(result?.code).toContain('"tags": ["docs", "toml"]')
    expect(result?.code).toContain('"draft": false')
    expect(result?.code).toMatch(/"published": new Date\(\d+\)/u)
    expect(result?.code).not.toContain("new TomlDate")
    expect(result?.code).toContain('"large": 9007199254740993n')
  })

  test("supports a custom export name and explicit disable", async () => {
    const custom = createViteMdxTransformer({
      frontmatter: { name: "pageData" },
    })
    const disabled = createViteMdxTransformer({ frontmatter: false })

    const customResult = await custom.transform(
      "---\ntitle: Custom\n---\n# Custom",
      "/custom.mdx",
    )
    const disabledResult = await disabled.transform(
      "---\ntitle: Plain\n---\n# Plain",
      "/plain.mdx",
    )

    expect(customResult?.code).toContain("export const pageData")
    expect(customResult?.code).not.toContain("export const metadata")
    expect(disabledResult?.code).not.toContain("export const metadata")
  })
})
