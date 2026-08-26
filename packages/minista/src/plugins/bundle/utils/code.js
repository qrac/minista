/** @typedef {import('../types').PluginOptions} PluginOptions */

/**
 * @param {PluginOptions} opts
 * @param {boolean} preserveExports
 * @returns {string}
 */
export function getGlobImportCode(opts, preserveExports = false) {
  const bundle = JSON.stringify(opts.src)
  const glob = `import.meta.glob(${bundle}, { eager: true })`

  // The build entry is removed from the output, but assigning its imports keeps
  // CSS Modules used by page exports from being tree-shaken before extraction.
  return preserveExports
    ? `globalThis.__ministaBundleModules = ${glob}`
    : glob
}
