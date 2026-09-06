// @ts-check
/// <reference types="remark-parse" />
/// <reference types="remark-stringify" />

import { valueToEstree } from "estree-util-value-to-estree"
import {
  frontmatterFromMarkdown,
  frontmatterToMarkdown,
} from "mdast-util-frontmatter"
import { frontmatter } from "micromark-extension-frontmatter"
import { parse as parseToml, TomlDate } from "smol-toml"
import { parse as parseYaml } from "yaml"

/** @typedef {import("mdast").Root} Root */
/** @typedef {import("micromark-extension-frontmatter").Preset} FrontmatterPreset */
/** @typedef {import("unified").Processor} Processor */
/** @typedef {{type: "yaml" | "toml", value: string}} FrontmatterNode */

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
 * Add YAML and TOML frontmatter syntax support and expose the parsed value as
 * an MDX named export.
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

  /** @type {FrontmatterPreset[]} */
  const matters = ["yaml", "toml"]
  micromarkExtensions.push(frontmatter(matters))
  fromMarkdownExtensions.push(frontmatterFromMarkdown(matters))
  toMarkdownExtensions.push(frontmatterToMarkdown(matters))

  return (/** @type {Root} */ tree) => {
    const node = /** @type {FrontmatterNode | undefined} */ (
      tree.children.find((child) => matters.includes(
        /** @type {FrontmatterPreset} */ (child.type),
      ))
    )
    const value = node?.type === "yaml"
      ? parseYaml(node.value)
      : node?.type === "toml"
        ? parseToml(node.value, { integersAsBigInt: "asNeeded" })
        : undefined

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
                init: valueToEstree(value, {
                  preserveReferences: true,
                  replacer(value) {
                    if (value instanceof TomlDate) {
                      return {
                        type: "NewExpression",
                        callee: { type: "Identifier", name: "Date" },
                        arguments: [{ type: "Literal", value: value.getTime() }],
                      }
                    }
                  },
                }),
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
