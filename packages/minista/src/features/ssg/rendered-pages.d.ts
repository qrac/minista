import type { ArtifactId } from "../../core/graph/index.js"

export interface RenderedPage {
  readonly url: string
  readonly fileName: string
  readonly html: string
}
export declare function createRenderedPagesArtifactId(): ArtifactId
export declare function parseRenderedPages(value: unknown): readonly RenderedPage[]
