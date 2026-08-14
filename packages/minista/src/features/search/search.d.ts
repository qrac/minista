import type { HtmlDocument } from "../../core/document/index.js"
import type { ArtifactId, FeatureId, PageNode } from "../../core/graph/index.js"
import type { MinistaFeature } from "../../core/lifecycle/index.js"

export interface SearchHitOptions {
  readonly minLength: number
  readonly number: boolean
  readonly english: boolean
  readonly hiragana: boolean
  readonly katakana: boolean
  readonly kanji: boolean
}

export interface SearchAnalyzeOptions {
  readonly trimTitle: string
  readonly targetSelector: string
  readonly ignoreSelectors: readonly string[]
}

export interface SearchFeatureOptions extends SearchAnalyzeOptions {
  readonly outName: string
  readonly src: readonly string[]
  readonly ignore: readonly string[]
  readonly relativeAttr: string
  readonly inputAttr: string
  readonly hit: SearchHitOptions
}

export interface SearchDocumentAnalysis {
  readonly words: readonly string[]
  readonly title: readonly string[]
  readonly toc: readonly (readonly [number, string])[]
  readonly content: readonly string[]
}

export interface SearchPageAnalysis extends SearchDocumentAnalysis {
  readonly url: string
}

export interface SearchDocumentAnalyzer {
  analyze(
    document: HtmlDocument,
    options: SearchAnalyzeOptions,
  ): Promise<SearchDocumentAnalysis>
}

export interface SearchData {
  readonly words: readonly string[]
  readonly hits: readonly number[]
  readonly pages: readonly {
    readonly url: string
    readonly title: readonly number[]
    readonly toc: readonly (readonly [number, string])[]
    readonly content: readonly number[]
  }[]
}

export declare const SEARCH_FEATURE_ID: FeatureId
export declare function createSearchDataArtifactId(outName: string): ArtifactId
export declare function getSearchPageFileName(url: string): string
export declare function getSearchPageUrl(fileName: string): string
export declare function createSearchData(
  analyses: readonly SearchPageAnalysis[],
  hit: SearchHitOptions,
): SearchData
export declare function composeSearchDocument(
  document: HtmlDocument,
  page: PageNode | undefined,
  options: SearchFeatureOptions,
): number
export declare function composeSearchOutputDocument(
  document: HtmlDocument,
  url: string,
  options: SearchFeatureOptions,
): number
export declare function createSearchFeature(
  options: SearchFeatureOptions,
  analyzer: SearchDocumentAnalyzer,
): MinistaFeature<SearchFeatureOptions>
