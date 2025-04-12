/** @typedef {import('./types').PluginOptions} PluginOptions */
/** @typedef {import('./types').SsgPage} SsgPage */

/**
 * @param {PluginOptions} opts
 * @returns {string}
 */
export function getGlobExportCode(opts) {
  const layoutRoot = opts.layoutRoot
  const pages = JSON.stringify(opts.src)
  return `const LAYOUTS = import.meta.glob(["${layoutRoot}"], { eager: true })
const PAGES = import.meta.glob(${pages}, { eager: true })
export { LAYOUTS, PAGES }`
}

/**
 * @param {SsgPage[]} ssgPages
 * @returns {string}
 */
export function getSsgExportCode(ssgPages) {
  return `export const ssgPages = ${JSON.stringify(ssgPages)}`
}
