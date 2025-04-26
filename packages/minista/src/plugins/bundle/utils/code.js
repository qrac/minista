/** @typedef {import('../types').PluginOptions} PluginOptions */

/**
 * @param {PluginOptions} opts
 * @returns {string}
 */
export function getGlobImportCode(opts) {
  const bundle = JSON.stringify(opts.src)
  return `import.meta.glob(${bundle}, { eager: true })`
}
