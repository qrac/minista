import type { HtmlDocument } from "../../core/document/index.js"
import type { FeatureId, PageId } from "../../core/graph/index.js"
import type { MinistaFeature } from "../../core/lifecycle/index.js"

export interface EntryFeatureOptions {}
export interface EntryReference {
  readonly pageId: PageId
  readonly source: string
  readonly attribute: string
}
export interface EntryBundleOutput {
  readonly source: string
  readonly fileName: string
  readonly cssFiles: readonly string[]
}
export interface EntryBundler {
  bundle(references: readonly EntryReference[]): Promise<readonly EntryBundleOutput[]>
}
export interface EntryOutputResolver {
  resolve(fileName: string, pageId: PageId): string | undefined
}
export declare const ENTRY_FEATURE_ID: FeatureId
export declare function collectEntryReferences(
  document: HtmlDocument,
): readonly EntryReference[]
export declare function composeEntryDocument(
  document: HtmlDocument,
  outputs: readonly EntryBundleOutput[],
  resolver: EntryOutputResolver,
): number
export declare function createEntryFeature(
  options: EntryFeatureOptions,
  bundler: EntryBundler,
  outputs: EntryOutputResolver,
): MinistaFeature<EntryFeatureOptions>
