// @ts-check

import { createProcessor } from "@mdx-js/mdx"
import { SourceMapGenerator } from "source-map"
import remarkFrontmatter from "remark-frontmatter"
import remarkMdxFrontmatter from "remark-mdx-frontmatter"

/** @typedef {import("@mdx-js/mdx").CompileOptions} CompileOptions */

/**
 * @param {Readonly<CompileOptions>} options
 * @returns {CompileOptions}
 */
function resolveOptions(options) {
  const remarkPlugins = Array.isArray(options.remarkPlugins)
    ? [...options.remarkPlugins]
    : []

  if (
    !remarkPlugins.some(
      (plugin) =>
        plugin === remarkFrontmatter ||
        (Array.isArray(plugin) && plugin[0] === remarkFrontmatter),
    )
  ) {
    remarkPlugins.unshift(remarkFrontmatter)
  }

  if (
    !remarkPlugins.some(
      (plugin) =>
        plugin === remarkMdxFrontmatter ||
        (Array.isArray(plugin) && plugin[0] === remarkMdxFrontmatter),
    )
  ) {
    remarkPlugins.splice(1, 0, [remarkMdxFrontmatter, { name: "metadata" }])
  }

  return {
    ...options,
    remarkPlugins,
    SourceMapGenerator,
  }
}

/**
 * Create reusable Markdown and MDX processors after the first matching module
 * reaches the Vite transform pipeline.
 *
 * @param {Readonly<CompileOptions>} options
 */
export function createMdxCompiler(options) {
  const resolved = resolveOptions(options)
  const markdown = createProcessor({ ...resolved, format: "md" })
  const mdx = createProcessor({ ...resolved, format: "mdx" })

  return Object.freeze({
    /** @param {string} value @param {string} filePath @param {"md" | "mdx"} format */
    process(value, filePath, format) {
      const processor = format === "md" ? markdown : mdx
      return processor.process({ path: filePath, value })
    },
  })
}
