import type { Config as SvgoConfig } from "svgo"
import type { HtmlDocument } from "../../core/document/index.js"
import type { ArtifactId, FeatureId, PageId } from "../../core/graph/index.js"
import type { MinistaFeature } from "../../core/lifecycle/index.js"

export interface SpriteFeatureOptions {
  readonly config?: SvgoConfig
}
export interface SpriteReference {
  readonly pageId: PageId
  readonly source: string
  readonly sourceDirectory: string
  readonly symbolId: string
}
export interface SpriteBuilder {
  build(sourceDirectory: string): Promise<string>
}
export interface SpriteOutputResolver {
  resolve(artifactId: ArtifactId, pageId: PageId): string | undefined
}
export declare const SPRITE_FEATURE_ID: FeatureId
export declare function createSpriteArtifactId(
  sourceDirectory: string,
): ArtifactId
export declare function collectSpriteReferences(
  document: HtmlDocument,
): readonly SpriteReference[]
export declare function composeSpriteDocument(
  document: HtmlDocument,
  outputs: SpriteOutputResolver,
): number
export declare function createSpriteFeature(
  options: SpriteFeatureOptions,
  builder: SpriteBuilder,
  outputs: SpriteOutputResolver,
): MinistaFeature<SpriteFeatureOptions>
