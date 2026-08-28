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
})
