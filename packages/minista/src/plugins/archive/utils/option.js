/** @typedef {import('../types').PluginOptions} PluginOptions */
/** @typedef {import('../types').SingleOptions} SingleOptions */

/**
 * @param {PluginOptions} opts
 * @returns {SingleOptions[]}
 */
export function mergeMultipleOptions(opts) {
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
