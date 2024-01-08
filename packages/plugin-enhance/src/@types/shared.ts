import type { HTMLElement as NHTMLElement } from "node-html-parser"

export type EnhancePage = {
  html: string
  commands: EnhanceCommand[]
}

export type EnhanceCommand = {
  selector?: string
  selectorAll?: string
  method?: "remove" | "replace" | "insert"
  position?: "before" | "after" | "start" | "end"
  attr?: string
  pattern?: string | RegExp
  value?: string
  html?: string
  component?: () => JSX.Element
  parsedHtml?: NHTMLElement
}
