import type { HtmlDocument } from "../../core/document/index.js"
import type {
  SearchAnalyzeOptions,
  SearchDocumentAnalysis,
  SearchDocumentAnalyzer,
} from "../../features/search/index.js"

export declare class NodeSearchDocumentAnalyzer
  implements SearchDocumentAnalyzer
{
  analyze(
    document: HtmlDocument,
    options: SearchAnalyzeOptions,
  ): Promise<SearchDocumentAnalysis>
}

export declare function getSpacedRawText(
  root: import("node-html-parser").HTMLElement,
): string
