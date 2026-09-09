// @ts-check

export class BeautifyOutputError extends Error {
  /** @param {string} code @param {string} message */
  constructor(code, message) {
    super(message)
    this.name = "BeautifyOutputError"
    this.code = code
    this.diagnostic = Object.freeze({
      code, message, severity: /** @type {const} */ ("error"),
      feature: "feature:beautify",
    })
  }
}

/**
 * CSS assets have already received their names by generateBundle. Only fixed
 * names and unmapped content can be safely formatted at this boundary.
 * @param {import("rolldown").OutputAsset} asset
 * @param {import("rolldown").NormalizedOutputOptions} options
 * @param {import("rolldown").OutputBundle} bundle
 */
export function assertBeautifyAssetOutput(asset, options, bundle) {
  if (!asset.fileName.endsWith(".css")) return
  if (options.sourcemap || bundle[`${asset.fileName}.map`] ||
    /[#@]\s*sourceMappingURL\s*=/.test(String(asset.source))) {
    throw new BeautifyOutputError(
      "MINISTA_BEAUTIFY_SOURCEMAP_UNSUPPORTED",
      "CSS beautification cannot preserve sourcemaps. Disable sourcemaps or exclude CSS from pluginBeautify.src.",
    )
  }
  if (typeof options.assetFileNames !== "string" || /\[hash(?::\d+)?\]/.test(options.assetFileNames)) {
    throw new BeautifyOutputError(
      "MINISTA_BEAUTIFY_CSS_HASH_UNSUPPORTED",
      "CSS beautification requires a fixed assetFileNames string without [hash]. Set build.rolldownOptions.output.assetFileNames to assets/[name][extname], or exclude CSS from pluginBeautify.src.",
    )
  }
}
