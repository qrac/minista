// @ts-check

import { createNodeId } from "../../core/graph/index.js"

/** @typedef {import("../../core/types.js").Capability} Capability */
/** @typedef {import("../../core/lifecycle/index.js").PhaseContext} PhaseContext */
/** @typedef {import("./finalize.js").ArchiveBuilder} ArchiveBuilder */
/** @typedef {import("./finalize.js").ArchiveFeatureOptions} ArchiveFeatureOptions */

export const ARCHIVE_FEATURE_ID = createNodeId("feature", "archive")

/** @template {import("./finalize.js").ArchiveDescriptorOptions} T @param {T} options */
export function createArchiveFeatureDescriptor(options) {
  return Object.freeze({
    id: ARCHIVE_FEATURE_ID,
    apiVersion: /** @type {const} */ (1),
    options: Object.freeze({
      ...options,
      archives: Object.freeze([...options.archives]),
    }),
    requires: [capability("output-files")],
    provides: [capability("archives")],
    optionalAfter: [createNodeId("feature", "beautify")],
  })
}

/** @param {string} value */
function capability(value) {
  return /** @type {Capability} */ (/** @type {unknown} */ (value))
}

/**
 * @param {ArchiveFeatureOptions} options
 * @param {ArchiveBuilder | import("./finalize.js").ArchivePublisher} builder
 * @returns {import("../../core/lifecycle/index.js").MinistaFeature<ArchiveFeatureOptions>}
 */
export function createArchiveFeature(options, builder) {
  return Object.freeze({
    ...createArchiveFeatureDescriptor(options),
    hooks: Object.freeze({
      /** @param {PhaseContext} context */
      async finalize(context) {
        const names = new Set()
        for (const archive of options.archives) {
          const name = `${archive.outName}.${archive.format ?? "zip"}`
          if (names.has(name)) throw new Error(`Output ${name} is already emitted.`)
          names.add(name)
        }
        for (const archive of options.archives) {
          const format = archive.format ?? "zip"
          const fileName = `${archive.outName}.${format}`
          if ("publish" in builder) {
            await builder.publish(archive, fileName)
            continue
          }
          await context.emitter.emit({
            fileName,
            content: await builder.build(archive),
            mediaType:
              format === "tar" ? "application/x-tar" : "application/zip",
          })
        }
      },
    }),
  })
}
