import type { Options as MdxOptions } from "@mdx-js/rollup"
import type { Options as RemarkGfmOptions } from "remark-gfm"
import type { Options as RehypeHighlightOptions } from "rehype-highlight"
import remarkFrontmatter from "remark-frontmatter"
import remarkMdxFrontmatter from "remark-mdx-frontmatter"
import remarkGfm from "remark-gfm"
import rehypeHighlight from "rehype-highlight"

export type UserPluginOptions = {
  useRemarkGfm?: boolean
  useRehypeHighlight?: boolean
  remarkGfmOptions?: RemarkGfmOptions
  rehypeHighlightOptions?: RehypeHighlightOptions
  mdxOptions?: MdxOptions
}

export type PluginOptions = {
  useRemarkGfm: boolean
  useRehypeHighlight: boolean
  remarkGfmOptions: RemarkGfmOptions
  rehypeHighlightOptions: RehypeHighlightOptions
  mdxOptions: MdxOptions
}

export const defaultOptions: PluginOptions = {
  useRemarkGfm: true,
  useRehypeHighlight: true,
  remarkGfmOptions: {},
  rehypeHighlightOptions: {},
  mdxOptions: {
    remarkPlugins: [],
    rehypePlugins: [],
  },
}

export function resolveMdxOptions(opts: PluginOptions): MdxOptions {
  const { useRemarkGfm, useRehypeHighlight } = opts
  const { remarkGfmOptions, rehypeHighlightOptions } = opts
  const { mdxOptions } = opts

  mdxOptions.remarkPlugins?.push(remarkFrontmatter)
  mdxOptions.remarkPlugins?.push([remarkMdxFrontmatter, { name: "metadata" }])

  if (useRemarkGfm) {
    mdxOptions.remarkPlugins?.push([remarkGfm, remarkGfmOptions])
  }
  if (useRehypeHighlight) {
    mdxOptions.rehypePlugins?.push([rehypeHighlight, rehypeHighlightOptions])
  }
  return mdxOptions
}
