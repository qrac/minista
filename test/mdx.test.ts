import { describe, expect, it } from "vitest"
import remarkFrontmatter from "remark-frontmatter"
import { remarkMdxFrontmatter } from "remark-mdx-frontmatter"
import remarkGfm from "remark-gfm"
import rehypeHighlight from "rehype-highlight"

import { getMdxConfig, getMdxPluginNames } from "../src/mdx"
import { defaultConfig } from "../src/config"

describe("getMdxConfig", () => {
  it("Test: getMdxConfig", async () => {
    const result = await getMdxConfig(defaultConfig)

    //console.log(result)
    expect(result).toEqual({
      remarkPlugins: [
        remarkFrontmatter,
        [remarkMdxFrontmatter, { name: "frontmatter" }],
        remarkGfm,
      ],
      rehypePlugins: [[rehypeHighlight, {}]],
    })
  })
})

describe("getMdxPluginNames", () => {
  it("Test: getMdxPluginNames", () => {
    const result = getMdxPluginNames([
      remarkFrontmatter,
      [remarkMdxFrontmatter],
    ])

    //console.log(result)
    expect(result).toEqual(["remarkFrontmatter", "remarkMdxFrontmatter"])
  })
})
