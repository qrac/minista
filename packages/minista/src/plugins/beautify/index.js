import { JsBeautifyFormatter } from "../../adapters/formatter/js-beautify.js"
import {
  BeautifyOutputError,
  assertBeautifyAssetOutput,
} from "../../adapters/vite/beautify-output.js"
import { registerViteFeatureLifecycle } from "../../adapters/vite/feature-lifecycle.js"

/** @typedef {import('vite').Plugin} Plugin */
/** @typedef {import('./types').PluginOptions} PluginOptions */
/** @typedef {import('./types').UserPluginOptions} UserPluginOptions */

import { isViteAppClientEnvironment } from "../../adapters/vite/app-config.js"
import { getViteBuildSession } from "../../adapters/vite/build-session.js"
import {
  createViteCompatibilityTraceHooks,
  processViteOutputs,
} from "../../adapters/vite/compatibility-lifecycle.js"
import {
  createBeautifyFeature,
  createBeautifyFeatureDescriptor,
  createOutputMatcher,
  createOutputFormatter,
} from "../../features/beautify/index.js"
import { mergeObj } from "../../shared/obj.js"
import { filterOutputAssets } from "../../shared/vite.js"

/** @type {PluginOptions} */
export const defaultOptions = {
  src: ["**/*.{html,css,js}"],
  htmlOptions: {
    indent_size: 2,
    max_preserve_newlines: 0,
    indent_inner_html: true,
    extra_liners: [],
    inline: ["span", "strong", "b", "small", "del", "s", "code", "br", "wbr"],
  },
  cssOptions: {
    indent_size: 2,
    space_around_combinator: true,
  },
  jsOptions: {
    indent_size: 2,
  },
}

/**
 * @param {UserPluginOptions} uOpts
 * @returns {Plugin}
 */
export function pluginBeautify(uOpts = {}) {
  /** @type {PluginOptions} */
  const opts = mergeObj(defaultOptions, uOpts)
  const isMatch = createOutputMatcher(opts)
  const formatter = new JsBeautifyFormatter()
  const feature = createBeautifyFeature(opts, formatter)
  const format = createOutputFormatter(opts, formatter)

  return registerViteFeatureLifecycle({
    name: "vite-plugin:minista-beautify",
    api: { minista: { feature: createBeautifyFeatureDescriptor(opts) } },
    enforce: "post",
    apply(_, { command, isSsrBuild }) {
      return command === "build" && !isSsrBuild
    },
    applyToEnvironment: isViteAppClientEnvironment,
    buildStart() {
      if (uOpts.removeImagePreload !== undefined) {
        throw new BeautifyOutputError(
          "MINISTA_BEAUTIFY_OPTION_MOVED",
          "removeImagePreload moved to pluginSsg (default: true). Move the option to pluginSsg and remove it from pluginBeautify.",
        )
      }
    },
    renderChunk: {
      order: "post",
      async handler(code, chunk, options) {
        if (!isMatch(chunk.fileName) || !chunk.fileName.endsWith(".js")) return null
        if (options.sourcemap) {
          throw new BeautifyOutputError(
            "MINISTA_BEAUTIFY_SOURCEMAP_UNSUPPORTED",
            "JS beautification cannot preserve sourcemaps. Disable sourcemaps or exclude JS from pluginBeautify.src.",
          )
        }
        if (options.minify !== false) {
          throw new BeautifyOutputError(
            "MINISTA_BEAUTIFY_MINIFY_UNSUPPORTED",
            "JS beautification requires build.rolldownOptions.output.minify: false because Rolldown minification (including dce-only) runs after renderChunk. Set output.minify to false or exclude JS from pluginBeautify.src.",
          )
        }
        const formatted = await format({ fileName: chunk.fileName, content: code })
        return { code: String(formatted.content), map: null }
      },
    },
    async generateBundle(options, bundle) {
      const outputAssets = filterOutputAssets(bundle)
      const assets = Object.values(outputAssets).filter((item) =>
        isMatch(item.fileName) && /\.(html|css)$/.test(item.fileName)
      )
      for (const item of assets) assertBeautifyAssetOutput(item, options, bundle)
      const processed = await processViteOutputs([
        ...assets.map((item) => ({
          fileName: item.fileName,
          content: item.source,
        })),
      ], [feature], createViteCompatibilityTraceHooks(
        getViteBuildSession(this.environment.getTopLevelConfig()),
        "beautify:build",
      ))
      const contentByFileName = new Map(processed.map((file) => [
        file.fileName,
        file.content,
      ]))
      for (const item of assets) {
        const content = contentByFileName.get(item.fileName)
        if (content !== undefined) item.source = content
      }
    },
  })
}
