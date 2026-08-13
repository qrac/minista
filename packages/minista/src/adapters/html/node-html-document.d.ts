import type {
  HtmlDocument,
  HtmlDocumentFactory,
  HtmlDocumentInput,
  HtmlElement,
  HtmlMarkerBinding,
  HtmlMarkerReference,
} from "../../core/document/index.js"
import type { FeatureId, PageId } from "../../core/graph/index.js"
import type { Diagnostic } from "../../core/diagnostics/index.js"

export type NodeHtmlDocumentOperation =
  | "parse"
  | "query"
  | "mutate"
  | "serialize"
export interface NodeHtmlDocumentErrorOptions {
  readonly operation: NodeHtmlDocumentOperation
  readonly pageId: PageId
}
export declare class NodeHtmlDocumentError extends Error {
  readonly code:
    | "MINISTA_HTML_PARSE_FAILED"
    | "MINISTA_HTML_QUERY_FAILED"
    | "MINISTA_HTML_MUTATION_FAILED"
    | "MINISTA_HTML_SERIALIZE_FAILED"
  readonly operation: NodeHtmlDocumentOperation
  readonly pageId: PageId
  readonly diagnostic: Diagnostic
  constructor(cause: unknown, options: NodeHtmlDocumentErrorOptions)
}

export declare class NodeHtmlElement implements HtmlElement {
  readonly tagName: string
  readonly text: string
  readonly innerHtml: string
  getAttribute(name: string): string | undefined
  hasAttribute(name: string): boolean
  setAttribute(name: string, value: string): void
  removeAttribute(name: string): void
  setInnerHtml(html: string): void
  appendHtml(html: string): void
  replaceWith(html: string): void
  remove(): void
}

export declare class NodeHtmlDocument implements HtmlDocument {
  readonly pageId: PageId
  constructor(input: HtmlDocumentInput)
  select(selector: string): readonly NodeHtmlElement[]
  bind(
    element: HtmlElement,
    reference: HtmlMarkerReference,
  ): HtmlMarkerBinding
  markers(featureId?: FeatureId): readonly HtmlMarkerBinding[]
  serialize(): string
}

export declare class NodeHtmlDocumentFactory implements HtmlDocumentFactory {
  parse(input: HtmlDocumentInput): NodeHtmlDocument
}
export declare function getNativeNodeHtmlDocumentRoot(
  document: HtmlDocument,
): import("node-html-parser").HTMLElement
