// @ts-check
/// <reference types="remark-parse" />
/// <reference types="remark-stringify" />

import { valueToEstree } from "estree-util-value-to-estree"
import {
  frontmatterFromMarkdown,
  frontmatterToMarkdown,
} from "mdast-util-frontmatter"
import { frontmatter } from "micromark-extension-frontmatter"
import { parse } from "yaml"

/** @typedef {import("mdast").Root} Root */
/** @typedef {import("unified").Processor} Processor */

const identifierPattern = /^[A-Za-z_$][\w$]*$/u
const reservedNames = new Set([
  "await", "break", "case", "catch", "class", "const", "continue",
  "debugger", "default", "delete", "do", "else", "enum", "export",
  "extends", "false", "finally", "for", "function", "if", "implements",
  "import", "in", "instanceof", "interface", "let", "new", "null",
  "package", "private", "protected", "public", "return", "static", "super",
  "switch", "this", "throw", "true", "try", "typeof", "var", "void",
  "while", "with", "yield",
])

/**
 * @param {string} name
 */
function assertExportName(name) {
  if (!identifierPattern.test(name) || reservedNames.has(name)) {
    throw new TypeError(`Invalid frontmatter export name: ${name}`)
  }
}

/**
 * Add YAML frontmatter syntax support and expose its parsed value as an MDX
 * named export.
 *
 * @this {Processor}
 * @param {{name?: string}} [options]
 */
export default function remarkMinistaFrontmatter(options = {}) {
  const name = options.name ?? "metadata"
  assertExportName(name)

  const data = this.data()
  const micromarkExtensions =
    data.micromarkExtensions || (data.micromarkExtensions = [])
  const fromMarkdownExtensions =
    data.fromMarkdownExtensions || (data.fromMarkdownExtensions = [])
  const toMarkdownExtensions =
    data.toMarkdownExtensions || (data.toMarkdownExtensions = [])

  micromarkExtensions.push(frontmatter("yaml"))
  fromMarkdownExtensions.push(frontmatterFromMarkdown("yaml"))
  toMarkdownExtensions.push(frontmatterToMarkdown("yaml"))

  return (/** @type {Root} */ tree) => {
    const node = tree.children.find((child) => child.type === "yaml")
    const value = node?.type === "yaml" ? parse(node.value) : undefined

    tree.children.unshift({
      type: "mdxjsEsm",
      value: "",
      data: {
        estree: {
          type: "Program",
          sourceType: "module",
          body: [{
            type: "ExportNamedDeclaration",
            declaration: {
              type: "VariableDeclaration",
              kind: "const",
              declarations: [{
                type: "VariableDeclarator",
                id: { type: "Identifier", name },
                init: valueToEstree(value, { preserveReferences: true }),
              }],
            },
            specifiers: [],
            attributes: [],
          }],
        },
      },
    })
  }
}
