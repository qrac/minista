import type { Options as MdxOptions } from "@mdx-js/esbuild"
import type { PluggableList, Pluggable } from "unified"
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
  recmaPlugins: [],
  allowDangerousRemoteMdx: false,
}

export async function getMdxConfig(userConfig: MinistaUserConfig) {
  const mergedConfig = userConfig.markdown
    ? { ...defaultMdxConfig, ...userConfig.markdown }
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
  const recmaPluginNames = mergedConfig.recmaPlugins
    ? getPluginNames(mergedConfig.recmaPlugins)
    : []

  const pluginNames = [
    ...remarkPluginNames,
    ...rehypePluginNames,
    ...recmaPluginNames,
  ]

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

  if (
    !pluginNames.includes("rehypeHighlight") &&
    !pluginNames.includes("rehypePrism") &&
    !pluginNames.includes("remarkHighlightjs") &&
    !pluginNames.includes("remarkPrism")
  ) {
    mergedConfig.rehypePlugins?.push(rehypeHighlight)
  }

  return mergedConfig
}
