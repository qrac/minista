import type { HTMLElement as NHTMLElement } from "node-html-parser"

import type { EnhancePage } from "./shared.js"

export * from "../node/index.js"

export type ImportedPages = {
  [key: string]: {
    default: () => EnhancePage
  }
}

export type FormatedPage = {
  path: string
} & EnhancePage

export type ResolvedPage = {
  path: string
  parsedHtml: NHTMLElement
} & Omit<EnhancePage, "html">
