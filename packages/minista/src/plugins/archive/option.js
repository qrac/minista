/** @typedef {import('./types').PluginOptions} PluginOptions */
/** @typedef {import('./types').SingleOptions} SingleOptions */

/** @type {PluginOptions} */
export const defaultOptions = {
  srcDir: "dist",
  outName: "dist",
  ignore: [],
  format: "zip",
  options: { zlib: { level: 9 } },
  multiple: [],
}

/**
 * @param {PluginOptions} opts
 * @returns {SingleOptions[]}
 */
export function resolveMultipleOptions(opts) {
  return [
    {
      srcDir: opts.srcDir,
      outName: opts.outName,
      ignore: opts.ignore,
      format: opts.format,
      options: opts.options,
    },
    ...opts.multiple.map((item) => ({
      srcDir: item.srcDir,
      outName: item.outName,
      ignore: item.ignore,
      format: item.format || opts.format,
      options: item.options || opts.options,
    })),
  ]
}
