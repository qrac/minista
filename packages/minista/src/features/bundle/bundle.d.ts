import type { HtmlDocument } from "../../core/document/index.js"
import type { FeatureId, PageId } from "../../core/graph/index.js"
import type { MinistaFeature } from "../../core/lifecycle/index.js"

export interface BundleFeatureOptions {
  readonly src: readonly string[]
  readonly outName: string
  readonly useExportCss: boolean
}
export interface BundlePlan {
  readonly cssFiles: readonly string[]
  readonly imageFiles: readonly string[]
  readonly rewriteRootImages: boolean
}
export interface BundleBuilder {
  bundle(options: BundleFeatureOptions): Promise<BundlePlan>
}
export interface BundleOutputResolver {
  resolve(fileName: string, pageId: PageId): string | undefined
}
export declare const BUNDLE_FEATURE_ID: FeatureId
export declare function composeBundleDocument(
  document: HtmlDocument,
  plan: BundlePlan,
  outputs: BundleOutputResolver,
): number
export declare function createBundleFeature(
  options: BundleFeatureOptions,
  builder: BundleBuilder,
  outputs: BundleOutputResolver,
): MinistaFeature<BundleFeatureOptions>
