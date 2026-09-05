import type { Diagnostic } from "../diagnostics/index.js"
import type { DiagnosticCollector } from "../diagnostics/index.js"
import type { AssetNode, BuildArtifact, FeatureNode, ImageNode, IslandNode, PageNode, ProjectGraphSnapshot, ProjectNode, RouteNode } from "./types.js"
import type { ArtifactId, FeatureId, PageId, RouteId } from "./ids.js"
export declare class ProjectGraph {
  #private
  static fromSnapshot(
    snapshot: ProjectGraphSnapshot,
    diagnostics: DiagnosticCollector,
  ): ProjectGraph
  constructor(project: ProjectNode, diagnostics: DiagnosticCollector)
  addFeature(node: FeatureNode): Diagnostic | undefined
  addRoute(node: RouteNode): Diagnostic | undefined
  addPage(node: PageNode): Diagnostic | undefined
  hasFeature(id: FeatureId): boolean
  getRoute(id: RouteId): RouteNode | undefined
  getRouteIdByPattern(pattern: string): RouteId | undefined
  getRouteByPattern(pattern: string): RouteNode | undefined
  getPage(id: PageId): PageNode | undefined
  getPageIdByUrl(url: string): PageId | undefined
  getPageByUrl(url: string): PageNode | undefined
  listPages(): IterableIterator<PageNode>
  updateRoute(node: RouteNode): Diagnostic | undefined
  updatePage(node: PageNode): Diagnostic | undefined
  removeRoute(id: RouteId): boolean
  removePage(id: PageId): boolean
  addAsset(node: AssetNode): Diagnostic | undefined
  addIsland(node: IslandNode): Diagnostic | undefined
  addImage(node: ImageNode): Diagnostic | undefined
  addArtifact(node: BuildArtifact): Diagnostic | undefined
  removeArtifactsByOwner(owners: ReadonlySet<FeatureId>): void
  removeArtifacts(ids: ReadonlySet<ArtifactId>): void
  snapshot(): ProjectGraphSnapshot
}
