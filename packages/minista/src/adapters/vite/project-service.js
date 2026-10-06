// @ts-check

import {
  DiagnosticCollector,
  ProjectGraph,
  createCommandResult,
  createNodeId,
  explainProjectNode,
  inspectProject,
  toProjectPath,
} from "../../core/index.js"
import {
  addDiscoveredRoutes,
  discoverRoutes,
  resolvePageNodes,
} from "../../features/ssg/index.js"

/** @typedef {import("./project-service.js").AnalyzeProjectInput} AnalyzeProjectInput */
/** @typedef {import("../../features/ssg/types.js").PageModule} PageModule */

/**
 * Vite ModuleRunnerをModuleEvaluator portへ変換し、project graphを構築する。
 *
 * @param {AnalyzeProjectInput} input
 */
export async function analyzeProject(input) {
  const diagnostics = new DiagnosticCollector()
  const graph = new ProjectGraph({
    id: createNodeId("project", input.projectName),
    name: input.projectName,
    root: toProjectPath("."),
  }, diagnostics)
  const featureId = createNodeId("feature", "ssg")
  graph.addFeature({
    id: featureId,
    apiVersion: 1,
    provides: ["routes", "pages", "html"],
    requires: [],
  })
  const options = { srcBases: input.srcBases }
  addDiscoveredRoutes(graph, diagnostics, input.sourceFiles, options)
  for (const { route } of discoverRoutes(input.sourceFiles, options)) {
    /** @type {PageModule} */
    let pageModule
    try {
      pageModule = await input.evaluator.importModule(route.pageModuleId)
    }
    catch (error) {
      diagnostics.error({
        code: "MINISTA_PAGE_MODULE_FAILED",
        message: error instanceof Error ? error.message : String(error),
        hint: "Fix the page module import or one of its dependencies.",
        location: { file: route.sourceFile },
        phase: "resolve",
        nodeId: route.id,
      })
      continue
    }
    if (!("default" in pageModule)) {
      diagnostics.error({
        code: "MINISTA_PAGE_DEFAULT_EXPORT_MISSING",
        message: `Page module ${route.sourceFile} has no default export.`,
        location: { file: route.sourceFile },
        phase: "resolve",
        nodeId: route.id,
      })
      continue
    }
    const pages = await resolvePageNodes(route, pageModule, diagnostics)
    for (const page of pages)
      graph.addPage(page)
  }
  const snapshot = graph.snapshot()
  if (input.command === "explain") {
    return createCommandResult("explain", explainProjectNode(snapshot, input.target ?? ""), diagnostics)
  }
  return createCommandResult(input.command, inspectProject(snapshot), diagnostics)
}
