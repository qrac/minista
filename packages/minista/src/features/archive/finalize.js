// @ts-check

import { createNodeId } from "../../core/graph/index.js"
import { BEAUTIFY_FEATURE_ID } from "../beautify/index.js"

/** @typedef {import("../../core/types.js").Capability} Capability */
/** @typedef {import("../../core/lifecycle/index.js").PhaseContext} PhaseContext */
/** @typedef {import("./finalize.js").ArchiveBuilder} ArchiveBuilder */
/** @typedef {import("./finalize.js").ArchiveFeatureOptions} ArchiveFeatureOptions */

export const ARCHIVE_FEATURE_ID = createNodeId("feature", "archive")

/** @param {string} value */
function capability(value) {
  return /** @type {Capability} */ (/** @type {unknown} */ (value))
}

/**
 * @param {ArchiveFeatureOptions} options
 * @param {ArchiveBuilder} builder
 * @returns {import("../../core/lifecycle/index.js").MinistaFeature<ArchiveFeatureOptions>}
 */
export function createArchiveFeature(options, builder) {
  return Object.freeze({
    id: ARCHIVE_FEATURE_ID,
    apiVersion: 1,
    options: Object.freeze({
      ...options,
      archives: Object.freeze([...options.archives]),
    }),
    requires: [capability("output-files")],
    provides: [capability("archives")],
    optionalAfter: [BEAUTIFY_FEATURE_ID],
    hooks: Object.freeze({
      /** @param {PhaseContext} context */
      async finalize(context) {
        for (const archive of options.archives) {
          const format = archive.format ?? "zip"
          await context.emitter.emit({
            fileName: `${archive.outName}.${format}`,
            content: await builder.build(archive),
            mediaType:
              format === "tar" ? "application/x-tar" : "application/zip",
          })
        }
      },
    }),
  })
}
