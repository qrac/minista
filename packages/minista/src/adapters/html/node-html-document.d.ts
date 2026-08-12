import type {
  HtmlDocument,
  HtmlDocumentFactory,
  HtmlDocumentInput,
  HtmlElement,
  HtmlMarkerBinding,
  HtmlMarkerReference,
} from "../../core/document/index.js"
import type { FeatureId, PageId } from "../../core/graph/index.js"

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
