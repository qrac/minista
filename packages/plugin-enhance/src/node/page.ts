import { parse as parseHtml } from "node-html-parser"
import { renderToString } from "react-dom/server"

import { getPagePath } from "minista-shared-utils"

import type {
  ImportedPages,
  FormatedPage,
  ResolvedPage,
} from "../@types/node.js"
import type { PluginOptions } from "./option.js"

export function formatPages(
  PAGES: ImportedPages,
  opts: PluginOptions
): FormatedPage[] {
  return Object.keys(PAGES).map((page) => {
    const pagePath = getPagePath(page, opts.srcBases)
    const pageData = PAGES[page].default()
    return {
      path: pagePath,
      ...pageData,
    }
  })
}

export function resolvePages(pages: FormatedPage[]): ResolvedPage[] {
  return pages.map((page) => {
    return {
      path: page.path,
      parsedHtml: parseHtml(page.html),
      commands: page.commands.map((command) => {
        if (command.html) {
          return {
            ...command,
            parsedHtml: parseHtml(command.html),
          }
        }
        if (command.component) {
          return {
            ...command,
            parsedHtml: parseHtml(renderToString(command.component())),
          }
        }
        return command
      }),
    }
  })
}
