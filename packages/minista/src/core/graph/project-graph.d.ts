import type { Diagnostic } from "../diagnostics/index.js"
import type { DiagnosticCollector } from "../diagnostics/index.js"
import type { AssetNode, BuildArtifact, FeatureNode, ImageNode, IslandNode, PageNode, ProjectGraphSnapshot, ProjectNode, RouteNode } from "./types.js"
export declare class ProjectGraph {
  #private
  constructor(project: ProjectNode, diagnostics: DiagnosticCollector)
  addFeature(node: FeatureNode): Diagnostic | undefined
  addRoute(node: RouteNode): Diagnostic | undefined
  addPage(node: PageNode): Diagnostic | undefined
  addAsset(node: AssetNode): Diagnostic | undefined
  addIsland(node: IslandNode): Diagnostic | undefined
  addImage(node: ImageNode): Diagnostic | undefined
  addArtifact(node: BuildArtifact): Diagnostic | undefined
  snapshot(): ProjectGraphSnapshot
}
