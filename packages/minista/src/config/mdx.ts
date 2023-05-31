import type { Options as MdxOptions } from "@mdx-js/rollup"
import remarkFrontmatter from "remark-frontmatter"
import remarkMdxFrontmatter from "remark-mdx-frontmatter"
import remarkGfm from "remark-gfm"
import rehypeHighlight from "rehype-highlight"

import type { ResolvedMainConfig } from "./main.js"

export type ResolvedMdxConfig = MdxOptions

export async function resolveMdxConfig(
  mainConfig: ResolvedMainConfig
): Promise<ResolvedMdxConfig> {
  const { useRemarkGfm, useRehypeHighlight } = mainConfig.markdown
  const { remarkGfmOptions, rehypeHighlightOptions } = mainConfig.markdown
  const { mdxOptions } = mainConfig.markdown

  mdxOptions.remarkPlugins?.push(remarkFrontmatter)
  mdxOptions.remarkPlugins?.push([
    remarkMdxFrontmatter,
    { name: "frontmatter" },
  ])

  if (useRemarkGfm) {
    mdxOptions.remarkPlugins?.push([remarkGfm, remarkGfmOptions])
  }
  if (useRehypeHighlight) {
    mdxOptions.rehypePlugins?.push([rehypeHighlight, rehypeHighlightOptions])
  }
  return mdxOptions
}
