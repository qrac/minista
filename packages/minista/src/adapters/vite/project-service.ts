import {
  DiagnosticCollector,
  ProjectGraph,
  createCommandResult,
  createNodeId,
  explainProjectNode,
  inspectProject,
  toProjectPath,
  type CommandName,
  type ModuleEvaluator,
} from "../../core/index.js"
import {
  addDiscoveredRoutes,
  discoverRoutes,
  resolvePageNodes,
  type PageModule,
} from "../../features/ssg/index.js"

export interface AnalyzeProjectInput {
  readonly command: Extract<CommandName, "check" | "inspect" | "explain">
  readonly projectName: string
  readonly sourceFiles: readonly string[]
  readonly srcBases: readonly string[]
  readonly target?: string
  readonly evaluator: ModuleEvaluator
}

export async function analyzeProject(input: AnalyzeProjectInput) {
  const diagnostics = new DiagnosticCollector()
  const graph = new ProjectGraph(
    {
      id: createNodeId("project", input.projectName),
      name: input.projectName,
      root: toProjectPath("."),
    },
    diagnostics,
  )
  const featureId = createNodeId("feature", "ssg")
  graph.addFeature({
    id: featureId,
    apiVersion: 1,
    provides: ["routes", "pages", "html"],
    requires: [],
  })
  const options = { srcBases: input.srcBases }
  addDiscoveredRoutes(
    graph,
    diagnostics,
    input.sourceFiles,
    options,
  )

  for (const { route } of discoverRoutes(input.sourceFiles, options)) {
    let pageModule: PageModule
    try {
      pageModule = await input.evaluator.importModule<PageModule>(
        route.pageModuleId,
      )
    } catch (error) {
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
    for (const page of pages) graph.addPage(page)
  }

  const snapshot = graph.snapshot()
  if (input.command === "explain") {
    return createCommandResult(
      "explain",
      explainProjectNode(snapshot, input.target ?? ""),
      diagnostics,
    )
  }
  return createCommandResult(
    input.command,
    inspectProject(snapshot),
    diagnostics,
  )
}
