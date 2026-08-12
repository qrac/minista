// @ts-check

import beautify from "js-beautify"
import picomatch from "picomatch"

import { createNodeId } from "../../core/graph/index.js"

/** @typedef {import("../../core/artifacts/index.js").EmittedFile} EmittedFile */
/** @typedef {import("../../core/document/index.js").HtmlDocument} HtmlDocument */
/** @typedef {import("../../core/types.js").Capability} Capability */
/** @typedef {import("../../core/lifecycle/index.js").PhaseContext} PhaseContext */
/** @typedef {import("./format.js").BeautifyFeatureOptions} BeautifyFeatureOptions */

export const BEAUTIFY_FEATURE_ID = createNodeId("feature", "beautify")

/** @param {string} value */
function capability(value) {
  return /** @type {Capability} */ (/** @type {unknown} */ (value))
}

/**
 * @param {HtmlDocument} document
 * @param {BeautifyFeatureOptions} options
 * @returns {number}
 */
export function composeBeautifyDocument(document, options) {
  if (!options.removeImagePreload) return 0
  const elements = document.select("body > link[rel=preload][as=image]")
  for (const element of elements) element.remove()
  return elements.length
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
 * @returns {(file: EmittedFile) => EmittedFile}
 */
export function createOutputFormatter(options) {
  const isMatch = createOutputMatcher(options)

  return (file) => {
    if (!isMatch(file.fileName) || typeof file.content !== "string") return file

    if (file.fileName.endsWith(".html")) {
      return Object.freeze({
        ...file,
        content: beautify.html(file.content, options.htmlOptions),
      })
    }
    if (file.fileName.endsWith(".css")) {
      return Object.freeze({
        ...file,
        content: beautify.css(file.content, options.cssOptions),
      })
    }
    if (file.fileName.endsWith(".js")) {
      return Object.freeze({
        ...file,
        content: beautify.js(file.content, options.jsOptions),
      })
    }
    return file
  }
}

/**
 * @param {BeautifyFeatureOptions} options
 * @returns {import("../../core/lifecycle/index.js").MinistaFeature<BeautifyFeatureOptions>}
 */
export function createBeautifyFeature(options) {
  const format = createOutputFormatter(options)

  return Object.freeze({
    id: BEAUTIFY_FEATURE_ID,
    apiVersion: 1,
    options: Object.freeze({ ...options }),
    requires: [capability("html-documents"), capability("output-files")],
    provides: [capability("formatted-output")],
    hooks: Object.freeze({
      /** @param {PhaseContext} context */
      compose(context) {
        for (const document of context.documents.list()) {
          composeBeautifyDocument(document, options)
        }
      },
      /** @param {PhaseContext} context */
      async finalize(context) {
        for (const file of await context.emitter.list()) {
          const formatted = format(file)
          if (formatted !== file) await context.emitter.replace(formatted)
        }
      },
    }),
  })
}
