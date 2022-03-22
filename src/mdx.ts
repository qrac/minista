import type { Options as MdxOptions } from "@mdx-js/esbuild"
import type { PluggableList, Pluggable } from "unified"
import remarkFrontmatter from "remark-frontmatter"
import { remarkMdxFrontmatter } from "remark-mdx-frontmatter"
import remarkGfm from "remark-gfm"

import shiki from "shiki"
import rehypeShiki from "@leafac/rehype-shiki"
import rehypePrism from "rehype-prism"
import rehypeHighlight from "rehype-highlight"

import type { MinistaMarkdownConfig } from "./types.js"

export const defaultMdxConfig: MdxOptions = {
  remarkPlugins: [],
  rehypePlugins: [],
}

export async function getMdxConfig(markdownConfig: MinistaMarkdownConfig) {
  const syntaxHighlighter = markdownConfig.syntaxHighlighter
    ? markdownConfig.syntaxHighlighter
    : "shiki"
  const shikiOptions = markdownConfig.shikiOptions
    ? markdownConfig.shikiOptions
    : { theme: "nord" }
  const highlightOptions = markdownConfig.highlightOptions
    ? markdownConfig.highlightOptions
    : {}
  const prismOptions = markdownConfig.prismOptions
    ? markdownConfig.prismOptions
    : {}

  const mergedConfig = markdownConfig.mdxOptions
    ? { ...defaultMdxConfig, ...markdownConfig.mdxOptions }
    : defaultMdxConfig

  function getPluginNames(plugins: PluggableList) {
    return plugins?.map((plugin: Pluggable<any[]>) =>
      //@ts-ignore
      plugin.name ? plugin.name : plugin[0].name
    )
  }

  const remarkPluginNames = mergedConfig.remarkPlugins
    ? getPluginNames(mergedConfig.remarkPlugins)
    : []
  const rehypePluginNames = mergedConfig.rehypePlugins
    ? getPluginNames(mergedConfig.rehypePlugins)
    : []

  const pluginNames = [...remarkPluginNames, ...rehypePluginNames]

  if (!pluginNames.includes("remarkFrontmatter")) {
    mergedConfig.remarkPlugins?.push(remarkFrontmatter)
  }

  if (!pluginNames.includes("remarkMdxFrontmatter")) {
    mergedConfig.remarkPlugins?.push([
      remarkMdxFrontmatter,
      { name: "frontmatter" },
    ])
  }

  if (!pluginNames.includes("remarkGfm")) {
    mergedConfig.remarkPlugins?.push(remarkGfm)
  }

  const highlighter = await shiki.getHighlighter(shikiOptions)

  if (
    !pluginNames.includes("remarkShiki") &&
    !pluginNames.includes("rehypeShiki") &&
    !pluginNames.includes("remarkHighlightjs") &&
    !pluginNames.includes("rehypeHighlight") &&
    !pluginNames.includes("remarkPrism") &&
    !pluginNames.includes("rehypePrism")
  ) {
    if (syntaxHighlighter === "shiki") {
      mergedConfig.rehypePlugins?.push([rehypeShiki, { highlighter }])
    }
    if (syntaxHighlighter === "highlight") {
      mergedConfig.rehypePlugins?.push([rehypeHighlight, highlightOptions])
    }
    if (syntaxHighlighter === "prism") {
      mergedConfig.rehypePlugins?.push([rehypePrism, prismOptions])
    }
  }

  return mergedConfig
}
