/** @typedef {import('../types').PluginOptions} PluginOptions */

/**
 * @param {PluginOptions} opts
 * @returns {string}
 */
export function getGlobImportCode(opts) {
  const layout = opts.layout
  const pages = JSON.stringify(opts.src)
  return `const LAYOUTS = import.meta.glob(["${layout}"], { eager: true })
const PAGES = import.meta.glob(${pages}, { eager: true })
export { LAYOUTS, PAGES }`
}
