import type { Options as MdxOptions } from "@mdx-js/esbuild"
import remarkFrontmatter from "remark-frontmatter"
import { remarkMdxFrontmatter } from "remark-mdx-frontmatter"
import remarkGfm from "remark-gfm"
import remarkHighlightjs from "remark-highlight.js"

export const defaultMdxConfig: MdxOptions = {
  remarkPlugins: [
    remarkFrontmatter,
    [remarkMdxFrontmatter, { name: "frontmatter" }],
    remarkGfm,
    remarkHighlightjs,
  ],
}

export async function getMdxConfig() {
  return defaultMdxConfig
}
