// @ts-check

import { createNodeId } from "../../core/graph/index.js"
import { createRenderedPagesArtifactId } from "./rendered-pages.js"

/** @typedef {import("../../core/types.js").Capability} Capability */
/** @typedef {import("../../core/lifecycle/index.js").PhaseContext} PhaseContext */
/** @typedef {import("./render.js").SsgPageRenderer} SsgPageRenderer */

export const SSG_FEATURE_ID = createNodeId("feature", "ssg")

/** @param {string} value */
function capability(value) {
  return /** @type {Capability} */ (/** @type {unknown} */ (value))
}

/** @param {string} url */
function getHtmlFileName(url) {
  const normalized = url.endsWith("/") ? `${url}index.html` : `${url}.html`
  return normalized.replace(/^\//, "")
}

/**
 * @param {SsgPageRenderer} renderer
 * @returns {import("../../core/lifecycle/index.js").MinistaFeature<Record<string, never>>}
 */
export function createSsgRenderFeature(renderer) {
  return Object.freeze({
    id: SSG_FEATURE_ID,
    apiVersion: 1,
    options: Object.freeze({}),
    provides: [capability("html")],
    hooks: Object.freeze({
      /** @param {PhaseContext} context */
      async render(context) {
        const pages = []
        for (const page of context.graph.snapshot().pages.values()) {
          if (page.draft) continue
          pages.push(Object.freeze({
            url: page.url,
            fileName: getHtmlFileName(page.url),
            html: await renderer.render(page),
          }))
        }
        const id = createRenderedPagesArtifactId()
        await context.artifacts.put({
          schemaVersion: "1",
          id,
          owner: SSG_FEATURE_ID,
          mediaType: "application/vnd.minista.rendered-pages+json",
          content: JSON.stringify(pages),
        })
        context.graph.addArtifact({
          id,
          kind: "data",
          owner: SSG_FEATURE_ID,
          source: "rendered-pages",
          dependencies: [],
        })
      },
    }),
  })
}
