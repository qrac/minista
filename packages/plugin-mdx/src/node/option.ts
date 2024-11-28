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
  const {
    useRemarkGfm,
    useRehypeHighlight,
    remarkGfmOptions,
    rehypeHighlightOptions,
    mdxOptions,
  } = opts

  const resolvedOptions: MdxOptions = {
    ...mdxOptions,
    remarkPlugins: [...(mdxOptions.remarkPlugins || [])],
    rehypePlugins: [...(mdxOptions.rehypePlugins || [])],
  }
  resolvedOptions.remarkPlugins?.push(remarkFrontmatter)
  resolvedOptions.remarkPlugins?.push([
    remarkMdxFrontmatter,
    { name: "metadata" },
  ])

  if (useRemarkGfm) {
    resolvedOptions.remarkPlugins?.push([remarkGfm, remarkGfmOptions])
  }
  if (useRehypeHighlight) {
    resolvedOptions.rehypePlugins?.push([
      rehypeHighlight,
      rehypeHighlightOptions,
    ])
  }
  return resolvedOptions
}
