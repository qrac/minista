import type { HtmlDocument } from "../../core/document/index.js"
import type { FeatureId, PageId } from "../../core/graph/index.js"
import type { MinistaFeature } from "../../core/lifecycle/index.js"
import type { CSSProperties } from "react"

export interface IslandFeatureOptions {
  readonly useSplitPages: boolean
  readonly outName: string
  readonly rootAttrName: string
  readonly rootDOMElement: "div" | "span"
  readonly rootStyle: CSSProperties
}
export interface IslandReference {
  readonly pageId: PageId
  readonly snippet: string
  readonly directive: string
}
export interface IslandSnippetSource {
  readonly index: number
  readonly encoded: string
  readonly code: string
}
export interface IslandEntrySource {
  readonly patternIndex: number
  readonly fileName: string
  readonly snippetIndexes: readonly number[]
  readonly code: string
}
export interface IslandSourcePlan {
  readonly snippets: readonly IslandSnippetSource[]
  readonly entries: readonly IslandEntrySource[]
  readonly pagePatterns: Readonly<Record<string, number>>
}
export interface IslandBundleOutput {
  readonly patternIndex: number
  readonly fileName: string
  readonly cssFiles: readonly string[]
}
export interface IslandEntryGenerator {
  createSnippet(encodedSnippet: string): Promise<string>
  createEntry(
    snippetIndexes: readonly number[],
    options: IslandFeatureOptions,
  ): Promise<string>
}
export interface IslandSourceTransformResult {
  readonly code: string
  readonly map?: string | null
  readonly snippets: readonly string[]
}
export interface IslandSourceTransformer {
  transform(
    code: string,
    moduleId: string,
    options: IslandFeatureOptions,
  ): IslandSourceTransformResult
}
export interface IslandBundler {
  bundle(plan: IslandSourcePlan): Promise<readonly IslandBundleOutput[]>
}
export interface IslandOutputResolver {
  resolve(fileName: string, pageId: PageId): string | undefined
}
export declare const ISLAND_FEATURE_ID: FeatureId
export declare function createIslandSnippetsArtifactId(): import("../../core/graph/index.js").ArtifactId
export declare function createIslandSourcePlanArtifactId(): import("../../core/graph/index.js").ArtifactId
export declare function createIslandBundleArtifactId(): import("../../core/graph/index.js").ArtifactId
export declare function parseIslandSnippets(value: unknown): readonly string[]
export declare function collectIslandReferences(
  document: HtmlDocument,
  options: IslandFeatureOptions,
): readonly IslandReference[]
export declare function createIslandSourcePlan(
  references: readonly IslandReference[],
  options: IslandFeatureOptions,
  generator: IslandEntryGenerator,
): Promise<IslandSourcePlan>
export declare function composeIslandDocument(
  document: HtmlDocument,
  sourcePlan: IslandSourcePlan,
  bundleOutputs: readonly IslandBundleOutput[],
  options: IslandFeatureOptions,
  outputs: IslandOutputResolver,
): number
export declare function createIslandFeature(
  options: IslandFeatureOptions,
  generator: IslandEntryGenerator,
  bundler: IslandBundler,
  outputs: IslandOutputResolver,
): MinistaFeature<IslandFeatureOptions>
