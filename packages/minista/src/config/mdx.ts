import type { Options as MdxOptions } from "@mdx-js/rollup"
import remarkFrontmatter from "remark-frontmatter"
import remarkMdxFrontmatter from "remark-mdx-frontmatter"
import remarkGfm from "remark-gfm"
import rehypeHighlight from "rehype-highlight"

import type { ResolvedMainConfig } from "./main.js"

export type ResolvedMdxConfig = MdxOptions

export function getMdxPluginNames(
  plugins: MdxOptions["remarkPlugins"] | MdxOptions["rehypePlugins"]
): string[] {
  if (Array.isArray(plugins) && plugins.length > 0) {
    // @ts-ignore
    return plugins.map((plugin) => (plugin.name ? plugin.name : plugin[0].name))
  } else {
    return []
  }
}

export async function resolveMdxConfig(
  mainConfig: ResolvedMainConfig
): Promise<ResolvedMdxConfig> {
  const syntaxHighlighter = mainConfig.markdown.syntaxHighlighter
  const highlightOptions = mainConfig.markdown.highlightOptions
  const mdxConfig = mainConfig.markdown.mdxOptions

  const remarkPluginNames = mdxConfig.remarkPlugins
    ? getMdxPluginNames(mdxConfig.remarkPlugins)
    : []
  const rehypePluginNames = mdxConfig.rehypePlugins
    ? getMdxPluginNames(mdxConfig.rehypePlugins)
    : []

  const pluginNames = [...new Set([...remarkPluginNames, ...rehypePluginNames])]

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
