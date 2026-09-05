// @ts-check

import { createProcessor } from "@mdx-js/mdx"
import { SourceMapGenerator } from "source-map"
import remarkMinistaFrontmatter from "../../internal/mdx/frontmatter.js"

/** @typedef {import("@mdx-js/mdx").CompileOptions} CompileOptions */
/** @typedef {import("../../plugins/ssg/types.js").PluginSsgMdxOptions} PluginSsgMdxOptions */
/** @typedef {PluginSsgMdxOptions & Pick<CompileOptions, "development">} MdxCompilerOptions */

/**
 * @param {Readonly<MdxCompilerOptions>} options
 * @returns {CompileOptions}
 */
function resolveOptions(options) {
  const { frontmatter = { name: "metadata" }, ...compileOptions } = options
  const remarkPlugins = Array.isArray(options.remarkPlugins)
    ? [...options.remarkPlugins]
    : []

  if (frontmatter !== false) {
    remarkPlugins.unshift([remarkMinistaFrontmatter, frontmatter])
  }

  return {
    ...compileOptions,
    remarkPlugins,
    SourceMapGenerator,
  }
}

/**
 * Create reusable Markdown and MDX processors after the first matching module
 * reaches the Vite transform pipeline.
 *
 * @param {Readonly<MdxCompilerOptions>} options
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
