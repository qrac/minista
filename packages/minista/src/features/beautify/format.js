// @ts-check

import picomatch from "picomatch"

import { createNodeId } from "../../core/graph/index.js"

/** @typedef {import("../../core/artifacts/index.js").EmittedFile} EmittedFile */
/** @typedef {import("../../core/types.js").Capability} Capability */
/** @typedef {import("../../core/lifecycle/index.js").PhaseContext} PhaseContext */
/** @typedef {import("./format.js").BeautifyFeatureOptions} BeautifyFeatureOptions */

export const BEAUTIFY_FEATURE_ID = createNodeId("feature", "beautify")

/** @param {BeautifyFeatureOptions} options */
export function createBeautifyFeatureDescriptor(options) {
  return Object.freeze({
    id: BEAUTIFY_FEATURE_ID,
    apiVersion: /** @type {const} */ (1),
    options: Object.freeze({ ...options }),
    requires: [capability("html-documents"), capability("output-files")],
    provides: [capability("formatted-output")],
    optionalAfter: ["comment", "svg", "image", "sprite", "entry", "island", "search"].map(
      (id) => createNodeId("feature", id),
    ),
  })
}

/** @param {string} value */
function capability(value) {
  return /** @type {Capability} */ (/** @type {unknown} */ (value))
}

/**
 * @param {BeautifyFeatureOptions} options
 * @returns {(fileName: string) => boolean}
 */
export function createOutputMatcher(options) {
  return picomatch([...options.src])
}

/**
 * @param {BeautifyFeatureOptions} options
 * @param {import("./format.js").OutputFormatter} formatter
 * @returns {(file: EmittedFile) => Promise<EmittedFile>}
 */
export function createOutputFormatter(options, formatter) {
  const isMatch = createOutputMatcher(options)
  return async (file) => {
    if (!isMatch(file.fileName) || typeof file.content !== "string" ||
      !/\.(html|css|js)$/.test(file.fileName)) return file
    return formatter.format(file, options)
  }
}

/**
 * @param {BeautifyFeatureOptions} options
 * @param {import("./format.js").OutputFormatter} formatter
 * @returns {import("../../core/lifecycle/index.js").MinistaFeature<BeautifyFeatureOptions>}
 */
export function createBeautifyFeature(options, formatter) {
  const format = createOutputFormatter(options, formatter)

  return Object.freeze({
    ...createBeautifyFeatureDescriptor(options),
    hooks: Object.freeze({
      /** @param {PhaseContext} context */
      async finalize(context) {
        for (const file of await context.emitter.list()) {
          const formatted = await format(file)
          if (formatted !== file) await context.emitter.replace(formatted)
        }
      },
    }),
  })
}
