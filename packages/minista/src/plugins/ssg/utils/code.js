/** @typedef {import('../types').PluginOptions} PluginOptions */

/**
 * plugin optionのproject root相対pathをVite root絶対pathへ変換する。
 * 旧形式の先頭slash付きpathはそのまま受け入れる。
 *
 * @param {string} input
 * @returns {string}
 */
export function toViteRootPath(input) {
  return input.startsWith("/") ? input : `/${input}`
}

/**
 * @param {PluginOptions} opts
 * @returns {string}
 */
export function getGlobImportCode(opts) {
  const layout = toViteRootPath(opts.layout)
  const pages = JSON.stringify(opts.src.map(toViteRootPath))
  return `const LAYOUTS = import.meta.glob(["${layout}"], { eager: true })
const PAGES = import.meta.glob(${pages}, { eager: true })
export { LAYOUTS, PAGES }`
}
