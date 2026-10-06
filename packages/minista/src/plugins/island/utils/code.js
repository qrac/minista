/** @typedef {import('../types').PluginOptions} PluginOptions */

/**
 * Shared by dev and build. Import expressions stay literal for Vite's chunk/CSS analysis.
 * @param {number[]} pattern
 * @param {PluginOptions} opts
 * @returns {string}
 */
export function getIslandBuildCode(pattern, opts) {
  const loaders = pattern.map((i) =>
    `${i}: () => import("./snippets/snippet-${i}")`,
  )
  return `import { runIslands } from "./runtime.js"
runIslands({${loaders.join(", ")}}, ${JSON.stringify(opts.rootAttrName)}, () => import("./renderer.js"))`
}
