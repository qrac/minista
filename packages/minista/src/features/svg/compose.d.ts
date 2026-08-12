import type { Config as SvgoConfig } from "svgo"
import type { HtmlDocument } from "../../core/document/index.js"
import type { FeatureId } from "../../core/graph/index.js"
import type { MinistaFeature } from "../../core/lifecycle/index.js"

export interface SvgFeatureOptions {
  readonly config?: SvgoConfig
}

export interface SvgSource {
  readonly innerHtml: string
  readonly viewBox?: string
}

export interface SvgSourceResolver {
  resolve(sourcePath: string): Promise<SvgSource | undefined>
}

export declare const SVG_FEATURE_ID: FeatureId

export declare function composeSvgDocument(
  document: HtmlDocument,
  sources: SvgSourceResolver,
): Promise<number>

export declare function createSvgFeature(
  options: SvgFeatureOptions,
  sources: SvgSourceResolver,
): MinistaFeature<SvgFeatureOptions>
