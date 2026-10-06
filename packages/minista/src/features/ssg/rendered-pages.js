// @ts-check

import { createNodeId } from "../../core/graph/index.js"

export function createRenderedPagesArtifactId() {
  return createNodeId("artifact", "ssg-rendered-pages")
}

/**
 * @param {unknown} value
 * @returns {readonly import("./rendered-pages.js").RenderedPage[]}
 */
export function parseRenderedPages(value) {
  if (!Array.isArray(value) || !value.every((page) =>
    page && typeof page === "object" &&
    typeof Reflect.get(page, "url") === "string" &&
    typeof Reflect.get(page, "fileName") === "string" &&
    typeof Reflect.get(page, "html") === "string"
  )) {
    throw new TypeError("Rendered pages must be an array of page snapshots.")
  }
  return Object.freeze(value.map((page) => Object.freeze({
    url: String(Reflect.get(page, "url")),
    fileName: String(Reflect.get(page, "fileName")),
    html: String(Reflect.get(page, "html")),
  })))
}
