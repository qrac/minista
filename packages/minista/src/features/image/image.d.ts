import type { HtmlDocument } from "../../core/document/index.js"
import type {
  ArtifactId,
  FeatureId,
  PageId,
} from "../../core/graph/index.js"
import type { MinistaFeature } from "../../core/lifecycle/index.js"

export interface ImageFeatureOptions {
  readonly useCache: boolean
  readonly optimize: Readonly<Record<string, unknown>>
  readonly decoding: string
  readonly loading: string
}
export interface ImageReference {
  readonly key: string
  readonly pageId: PageId
  readonly tagName: "img" | "source"
  readonly source: string
  readonly optimize: Readonly<Record<string, unknown>>
  readonly sizes: string
  readonly width: string
  readonly height: string
}
export interface GeneratedImageArtifact {
  readonly id: ArtifactId
  readonly source: string
  readonly fileName: string
  readonly mediaType: string
  readonly content: string | Uint8Array
}
export interface GeneratedImageOutput {
  readonly id: ArtifactId
  readonly source: string
  readonly fileName: string
  readonly mediaType: string
}
export interface GeneratedImagePlan {
  readonly key: string
  readonly src?: ArtifactId
  readonly srcset: readonly {
    readonly descriptor: string
    readonly artifactId: ArtifactId
  }[]
  readonly sizes: string
  readonly width: number
  readonly height: number
}
export interface GeneratedImageResult {
  readonly artifacts: readonly GeneratedImageArtifact[]
  readonly plans: readonly GeneratedImagePlan[]
}
export interface ImageGenerator {
  generate(
    references: readonly ImageReference[],
    options: ImageFeatureOptions,
  ): Promise<GeneratedImageResult>
}
export interface ImageOutputResolver {
  resolve(artifactId: ArtifactId, pageId: PageId): string | undefined
}
export interface ImageComposition {
  readonly src?: string
  readonly srcset: string
  readonly sizes: string
  readonly width: number
  readonly height: number
}
export interface ImageMutableElement {
  readonly tagName: string
  setAttribute(name: string, value: string): void
  removeAttribute(name: string): void
}
export declare const IMAGE_FEATURE_ID: FeatureId
export declare function createImageOutputsArtifactId(): ArtifactId
export declare function createImagePlansArtifactId(): ArtifactId
export declare function collectImageReferences(
  document: HtmlDocument,
): readonly ImageReference[]
export declare function applyImageComposition(
  element: ImageMutableElement,
  composition: ImageComposition,
): void
export declare function composeImageDocument(
  document: HtmlDocument,
  plans: readonly GeneratedImagePlan[],
  outputs: ImageOutputResolver,
): number
export declare function createImageFeature(
  options: ImageFeatureOptions,
  generator: ImageGenerator,
  outputs: ImageOutputResolver,
): MinistaFeature<ImageFeatureOptions>
