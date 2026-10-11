// @ts-check
import { createNodeId } from "../../core/graph/index.js"

/** @param {{manifest?: string, register?: string}} tags
 * @returns {import("../../core/lifecycle/index.js").MinistaFeature} */
export function createPwaFeature(tags) {
  return {
    id: createNodeId("feature", "pwa"), apiVersion: 1, options: tags,
    provides: [/** @type {import("../../core/types.js").Capability} */ ("pwa-html")],
    requires: [/** @type {import("../../core/types.js").Capability} */ ("html-documents")],
    optionalAfter: ["comment", "svg", "image", "sprite", "entry", "island", "search", "beautify"].map(id => createNodeId("feature", id)),
    hooks: {
      compose(context) {
        for (const document of context.documents.list()) {
          const head = document.select("head")[0]
          if (!head) {
            context.diagnostics.add({ code: "MINISTA_PWA_HEAD_MISSING", severity: "error", message: "PWA pages must contain a head element.", nodeId: document.pageId })
            continue
          }
          if (tags.manifest && !document.select('link[rel="manifest"]').length) head.appendHtml(tags.manifest)
          if (tags.register) head.appendHtml(tags.register)
        }
      },
    },
  }
}
