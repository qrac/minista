import type { PageId } from "../graph/index.js"
import type { HtmlDocument, HtmlDocumentStore } from "./types.js"

export declare class MemoryHtmlDocumentStore implements HtmlDocumentStore {
  put(document: HtmlDocument): void
  get(pageId: PageId): HtmlDocument | undefined
  list(): readonly HtmlDocument[]
  clear(): void
}
