import type {
  CSSBeautifyOptions,
  HTMLBeautifyOptions,
  JSBeautifyOptions,
} from "js-beautify"
import type { EmittedFile } from "../../core/artifacts/index.js"
import type { HtmlDocument } from "../../core/document/index.js"
import type { FeatureId } from "../../core/graph/index.js"
import type { MinistaFeature } from "../../core/lifecycle/index.js"

export interface BeautifyFeatureOptions {
  readonly src: readonly string[]
  readonly htmlOptions: HTMLBeautifyOptions
  readonly cssOptions: CSSBeautifyOptions
  readonly jsOptions: JSBeautifyOptions
  readonly removeImagePreload: boolean
}

export declare const BEAUTIFY_FEATURE_ID: FeatureId

export declare function composeBeautifyDocument(
  document: HtmlDocument,
  options: BeautifyFeatureOptions,
): number

export declare function createOutputFormatter(
  options: BeautifyFeatureOptions,
): (file: EmittedFile) => EmittedFile

export declare function createOutputMatcher(
  options: BeautifyFeatureOptions,
): (fileName: string) => boolean

export declare function createBeautifyFeature(
  options: BeautifyFeatureOptions,
): MinistaFeature<BeautifyFeatureOptions>
