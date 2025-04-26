/** @typedef {import('../types').PluginOptions} PluginOptions */

import remarkFrontmatter from "remark-frontmatter"
import remarkMdxFrontmatter from "remark-mdx-frontmatter"

/**
 * @param {PluginOptions} opts
 * @returns {PluginOptions}
 */
export function resolveMdxOptions(opts) {
  const remarkPlugins = Array.isArray(opts.remarkPlugins)
    ? [...opts.remarkPlugins]
    : []

  if (
    !remarkPlugins.some(
      (p) =>
        p === remarkFrontmatter ||
        (Array.isArray(p) && p[0] === remarkFrontmatter)
    )
  ) {
    remarkPlugins.unshift(remarkFrontmatter)
  }

  if (
    !remarkPlugins.some(
      (p) =>
        p === remarkMdxFrontmatter ||
        (Array.isArray(p) && p[0] === remarkMdxFrontmatter)
    )
  ) {
    remarkPlugins.splice(1, 0, [remarkMdxFrontmatter, { name: "metadata" }])
  }

  return {
    ...opts,
    remarkPlugins,
  }
}
