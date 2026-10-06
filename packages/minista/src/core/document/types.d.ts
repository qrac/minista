import type { FeatureId, PageId } from "../graph/index.js"

export interface HtmlElement {
  readonly tagName: string
  readonly text: string
  readonly innerHtml: string
  readonly outerHtml: string
  getAttribute(name: string): string | undefined
  hasAttribute(name: string): boolean
  setAttribute(name: string, value: string): void
  removeAttribute(name: string): void
  setInnerHtml(html: string): void
  appendHtml(html: string): void
  replaceWith(html: string): void
  remove(): void
}

export interface HtmlMarkerReference {
  readonly featureId: FeatureId
  readonly nodeId: string
}

export interface HtmlMarkerBinding extends HtmlMarkerReference {
  readonly element: HtmlElement
}

export interface HtmlDocument {
  readonly pageId: PageId
  select(selector: string): readonly HtmlElement[]
  bind(
    element: HtmlElement,
    reference: HtmlMarkerReference,
  ): HtmlMarkerBinding
  markers(featureId?: FeatureId): readonly HtmlMarkerBinding[]
  serialize(): string
}

export interface HtmlDocumentInput {
  readonly pageId: PageId
  readonly html: string
}

export interface HtmlDocumentFactory {
  parse(input: HtmlDocumentInput): HtmlDocument
}

export interface HtmlDocumentStore {
  put(document: HtmlDocument): void
  replace(document: HtmlDocument): void
  delete(pageId: PageId): boolean
  get(pageId: PageId): HtmlDocument | undefined
  list(): readonly HtmlDocument[]
  clear(): void
}
