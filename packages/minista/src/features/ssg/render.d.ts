import type { FeatureId, PageNode } from "../../core/graph/index.js"
import type { MinistaFeature } from "../../core/lifecycle/index.js"

export interface SsgPageRenderer {
  render(page: PageNode): Promise<string>
}
export declare const SSG_FEATURE_ID: FeatureId
export declare function createSsgRenderFeature(
  renderer: SsgPageRenderer,
): MinistaFeature<Record<string, never>>
