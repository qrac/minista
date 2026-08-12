import type { ProjectPath } from "../types.js"
import type { ArtifactId, AssetId, FeatureId, ImageId, IslandId, PageId, ProjectId, RouteId } from "./ids.js"
export interface ProjectNode {
  readonly id: ProjectId
  readonly name: string
  readonly root: ProjectPath
}
export interface FeatureNode {
  readonly id: FeatureId
  readonly apiVersion: 1
  readonly provides: readonly string[]
  readonly requires: readonly string[]
}
export interface RouteParam {
  readonly name: string
  readonly optional: boolean
  readonly rest: boolean
}
export interface RouteNode {
  readonly id: RouteId
  readonly sourceFile: ProjectPath
  readonly pattern: string
  readonly params: readonly RouteParam[]
  readonly pageModuleId: string
}
export interface PageNode<Props extends Record<string, unknown> = Record<string, unknown>> {
  readonly id: PageId
  readonly routeId: RouteId
  readonly url: string
  readonly params: Readonly<Record<string, string>>
  readonly props: Readonly<Props>
  readonly metadata: Readonly<Record<string, unknown>>
  readonly draft: boolean
}
export type AssetKind = "source" | "generated" | "remote" | "bundle"
export interface OutputLocation {
  readonly fileName: string
  readonly url: string
}
export interface AssetNode {
  readonly id: AssetId
  readonly kind: AssetKind
  readonly source?: ProjectPath
  readonly contentHash?: string
  readonly consumers: readonly PageId[]
  readonly output?: OutputLocation
}
export interface IslandNode {
  readonly id: IslandId
  readonly componentModuleId: string
  readonly directive: string
  readonly pages: readonly PageId[]
}
export interface ImageNode {
  readonly id: ImageId
  readonly source: string
  readonly pages: readonly PageId[]
  readonly generatedAssets: readonly AssetId[]
}
export type ArtifactKind = "html" | "script" | "style" | "image" | "sprite" | "data" | "archive"
export interface BuildArtifact {
  readonly id: ArtifactId
  readonly kind: ArtifactKind
  readonly owner: FeatureId
  readonly source: string
  readonly output?: OutputLocation
  readonly dependencies: readonly ArtifactId[]
}
export interface ProjectGraphSnapshot {
  readonly schemaVersion: "1"
  readonly project: ProjectNode
  readonly features: ReadonlyMap<FeatureId, FeatureNode>
  readonly routes: ReadonlyMap<RouteId, RouteNode>
  readonly pages: ReadonlyMap<PageId, PageNode>
  readonly assets: ReadonlyMap<AssetId, AssetNode>
  readonly islands: ReadonlyMap<IslandId, IslandNode>
  readonly images: ReadonlyMap<ImageId, ImageNode>
  readonly artifacts: ReadonlyMap<ArtifactId, BuildArtifact>
}
