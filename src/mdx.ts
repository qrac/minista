import type { PluggableList, Pluggable } from "unified"
import type { Options as MdxOptions } from "@mdx-js/esbuild"

import remarkFrontmatter from "remark-frontmatter"
import { remarkMdxFrontmatter } from "remark-mdx-frontmatter"
import remarkGfm from "remark-gfm"
import rehypeHighlight from "rehype-highlight"

import type { MinistaResolveConfig } from "./types.js"

export async function getMdxConfig(
  config: MinistaResolveConfig
): Promise<MdxOptions> {
  const syntaxHighlighter = config.markdown.syntaxHighlighter
  const highlightOptions = config.markdown.highlightOptions
  const mdxConfig = config.markdown.mdxOptions

  const remarkPluginNames = mdxConfig.remarkPlugins
    ? getMdxPluginNames(mdxConfig.remarkPlugins)
    : []
  const rehypePluginNames = mdxConfig.rehypePlugins
    ? getMdxPluginNames(mdxConfig.rehypePlugins)
    : []

  const pluginNames = [...remarkPluginNames, ...rehypePluginNames]

  if (!pluginNames.includes("remarkFrontmatter")) {
    mdxConfig.remarkPlugins?.push(remarkFrontmatter)
  }

  if (!pluginNames.includes("remarkMdxFrontmatter")) {
    mdxConfig.remarkPlugins?.push([
      remarkMdxFrontmatter,
      { name: "frontmatter" },
    ])
  }

  if (!pluginNames.includes("remarkGfm")) {
    mdxConfig.remarkPlugins?.push(remarkGfm)
  }

  if (
    !pluginNames.includes("remarkHighlightjs") &&
    !pluginNames.includes("rehypeHighlight") &&
    !pluginNames.includes("remarkShiki") &&
    !pluginNames.includes("rehypeShiki") &&
    !pluginNames.includes("remarkPrism") &&
    !pluginNames.includes("rehypePrism")
  ) {
    if (syntaxHighlighter === "highlight") {
      mdxConfig.rehypePlugins?.push([rehypeHighlight, highlightOptions])
    }
  }
  return mdxConfig
}

export function getMdxPluginNames(plugins: PluggableList): string[] {
  return plugins?.map((plugin: Pluggable<any[]>) =>
    //@ts-ignore
    plugin.name ? plugin.name : plugin[0].name
  )
}
