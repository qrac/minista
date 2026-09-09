import type {
  CSSBeautifyOptions,
  HTMLBeautifyOptions,
  JSBeautifyOptions,
} from "js-beautify"
import type { EmittedFile } from "../../core/artifacts/index.js"
import type { FeatureId } from "../../core/graph/index.js"
import type { MinistaFeature } from "../../core/lifecycle/index.js"

export interface BeautifyFeatureOptions {
  readonly src: readonly string[]
  readonly htmlOptions: HTMLBeautifyOptions
  readonly cssOptions: CSSBeautifyOptions
  readonly jsOptions: JSBeautifyOptions
}

export declare const BEAUTIFY_FEATURE_ID: FeatureId

export interface OutputFormatter {
  format(file: EmittedFile, options: BeautifyFeatureOptions): Promise<EmittedFile>
}

export declare function createOutputFormatter(
  options: BeautifyFeatureOptions,
  formatter: OutputFormatter,
): (file: EmittedFile) => Promise<EmittedFile>

export declare function createOutputMatcher(
  options: BeautifyFeatureOptions,
): (fileName: string) => boolean

export declare function createBeautifyFeature(
  options: BeautifyFeatureOptions,
  formatter: OutputFormatter,
): MinistaFeature<BeautifyFeatureOptions>
export declare function createBeautifyFeatureDescriptor(
  options: BeautifyFeatureOptions,
): Omit<MinistaFeature<BeautifyFeatureOptions>, "hooks">
