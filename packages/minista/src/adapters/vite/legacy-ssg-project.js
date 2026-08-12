// @ts-check

import {
  DiagnosticCollector,
  ProjectGraph,
  createNodeId,
  toProjectPath,
} from "../../core/index.js"
import {
  discoverRoute,
  resolvePageNodes,
} from "../../features/ssg/index.js"

/** @typedef {import("../../plugins/ssg/types.js").ImportedPages} ImportedPages */
/** @typedef {import("../../plugins/ssg/types.js").PluginOptions} PluginOptions */
/** @typedef {import("../../plugins/ssg/types.js").ResolvedPage} ResolvedPage */
/** @typedef {import("./legacy-ssg-project.js").LegacySsgProjectResult} LegacySsgProjectResult */

/**
 * 現行のglob moduleをRoute/Page Graphへ変換し、legacy renderer用のpageへ投影する。
 *
 * @param {ImportedPages} importedPages
 * @param {Pick<PluginOptions, "srcBases">} options
 * @returns {Promise<LegacySsgProjectResult>}
 */
export async function resolveLegacySsgProject(importedPages, options) {
  const diagnostics = new DiagnosticCollector()
  const graph = new ProjectGraph(
    {
      id: createNodeId("project", "legacy-ssg"),
      name: "legacy-ssg",
      root: toProjectPath("."),
    },
    diagnostics,
  )

  graph.addFeature({
    id: createNodeId("feature", "ssg"),
    apiVersion: 1,
    provides: ["routes", "pages", "html"],
    requires: [],
  })

  /** @type {ResolvedPage[]} */
  const pages = []

  for (const sourceFile of Object.keys(importedPages).sort()) {
    const pageModule = importedPages[sourceFile]
    if (!pageModule) continue

    const { route } = discoverRoute(sourceFile, options)
    graph.addRoute(route)

    const pageNodes = await resolvePageNodes(
      route,
      {
        default: pageModule.default,
        getStaticData: pageModule.getStaticData,
        metadata: { ...(pageModule.metadata ?? {}) },
      },
      diagnostics,
    )
    for (const page of pageNodes) {
      graph.addPage(page)
      pages.push({
        pageId: page.id,
        url: page.url,
        component: pageModule.default,
        staticData: {
          paths: page.params,
          props: page.props,
        },
        metadata: page.metadata,
      })
    }
  }

  return Object.freeze({
    graph: graph.snapshot(),
    pages: Object.freeze(pages),
    diagnostics: diagnostics.snapshot(),
  })
}
