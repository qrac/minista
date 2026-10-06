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
/** @typedef {import("./legacy-ssg-project.js").LegacySsgRouteEntry} LegacySsgRouteEntry */

/**
 * @param {DiagnosticCollector} diagnostics
 * @param {string} projectName
 */
function createGraph(diagnostics, projectName) {
  const graph = new ProjectGraph(
    {
      id: createNodeId("project", projectName),
      name: projectName,
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
  return graph
}

/**
 * @param {string} sourceFile
 * @param {ImportedPages[string]} pageModule
 * @param {Pick<PluginOptions, "srcBases">} options
 * @returns {Promise<LegacySsgRouteEntry>}
 */
export async function resolveLegacySsgRoute(sourceFile, pageModule, options) {
  const diagnostics = new DiagnosticCollector()
  const { route } = discoverRoute(sourceFile, options)
  const pageNodes = await resolvePageNodes(
    route,
    {
      default: pageModule.default,
      getStaticData: pageModule.getStaticData,
      metadata: { ...(pageModule.metadata ?? {}) },
    },
    diagnostics,
  )
  const pages = pageNodes.map((page) => Object.freeze({
    pageId: page.id,
    url: page.url,
    component: pageModule.default,
    staticData: {
      paths: page.params,
      props: page.props,
    },
    metadata: page.metadata,
  }))
  return Object.freeze({
    sourceFile,
    route,
    pageNodes,
    pages: Object.freeze(pages),
    diagnostics: diagnostics.snapshot(),
  })
}

/**
 * @param {readonly LegacySsgRouteEntry[]} entries
 * @param {string} [projectName]
 * @returns {LegacySsgProjectResult}
 */
export function createLegacySsgProject(entries, projectName = "legacy-ssg") {
  const diagnostics = new DiagnosticCollector()
  const graph = createGraph(diagnostics, projectName)
  /** @type {ResolvedPage[]} */
  const pages = []

  for (const entry of entries) {
    for (const diagnostic of entry.diagnostics) diagnostics.add(diagnostic)
    graph.addRoute(entry.route)
    for (const page of entry.pageNodes) graph.addPage(page)
    pages.push(...entry.pages)
  }

  return Object.freeze({
    graph: graph.snapshot(),
    pages: Object.freeze(pages),
    diagnostics: diagnostics.snapshot(),
  })
}

/**
 * 現行のglob moduleをRoute/Page Graphへ変換し、legacy renderer用のpageへ投影する。
 *
 * @param {ImportedPages} importedPages
 * @param {Pick<PluginOptions, "srcBases">} options
 * @param {string} [projectName]
 * @returns {Promise<LegacySsgProjectResult>}
 */
export async function resolveLegacySsgProject(
  importedPages,
  options,
  projectName = "legacy-ssg",
) {
  /** @type {LegacySsgRouteEntry[]} */
  const entries = []
  for (const sourceFile of Object.keys(importedPages).sort()) {
    const pageModule = importedPages[sourceFile]
    if (!pageModule) continue
    entries.push(await resolveLegacySsgRoute(sourceFile, pageModule, options))
  }
  return createLegacySsgProject(entries, projectName)
}
