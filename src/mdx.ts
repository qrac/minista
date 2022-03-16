import type { Options as MdxOptions } from "@mdx-js/esbuild"
import remarkFrontmatter from "remark-frontmatter"
import { remarkMdxFrontmatter } from "remark-mdx-frontmatter"
import remarkGfm from "remark-gfm"
import rehypeHighlight from "rehype-highlight"

import type { MinistaUserConfig } from "./types.js"

export const defaultMdxConfig: MdxOptions = {
  remarkPlugins: [
    remarkFrontmatter,
    [remarkMdxFrontmatter, { name: "frontmatter" }],
    remarkGfm,
  ],
  rehypePlugins: [rehypeHighlight],
}

export async function getMdxConfig(userConfig: MinistaUserConfig) {
  const mergedConfig = userConfig.markdown
    ? { ...defaultMdxConfig, ...userConfig.markdown }
    : defaultMdxConfig
  return mergedConfig
}
