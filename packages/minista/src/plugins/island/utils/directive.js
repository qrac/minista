/** @typedef {import('@swc/core').Node} Node */
/** @typedef {import('@swc/core').Module} Module */
/** @typedef {import('@swc/core').ModuleItem} ModuleItem */
/** @typedef {import('@swc/core').Program} Program */
/** @typedef {import('@swc/core').Expression} Expression */
/** @typedef {import('@swc/core').ObjectExpression} ObjectExpression */
/** @typedef {import('@swc/core').JSXElement} JSXElement */
/** @typedef {Node & Record<string, any>} ASTNode */
/** @typedef {import('../types').PluginOptions} PluginOptions */

import path from "node:path"
import { parseSync, printSync } from "@swc/core"
import { normalizePath } from "vite"

import { getSnippet, encodeSnippet } from "./snippet.js"

/**
 * @param {ASTNode} node
 * @returns {string}
 */
function printNode(node) {
  const stmt = {
    type: "ExpressionStatement",
    span: node.span ?? { start: 0, end: 0 },
    expression: node,
  }
  const mod = {
    type: "Module",
    span: node.span ?? { start: 0, end: 0 },
    body: [stmt],
    directives: [],
    interpreter: null,
  }
  // @ts-ignore
  return printSync(mod).code.replace(/;$/, "")
}

/**
 * @param {ObjectExpression} objExpr
 * @returns {{[key: string]: any}}
 */
function evalObjectExpr(objExpr) {
  /** @type {{[key: string]: any}} */
  let out = {}
  for (const prop of objExpr.properties) {
    if (prop.type !== "KeyValueProperty") continue
    // @ts-ignore
    const key = prop.key.value
    const val = prop.value
    if (val.type === "StringLiteral") out[key] = val.value
    else if (val.type === "NumericLiteral") out[key] = val.value
    else if (val.type === "BooleanLiteral") out[key] = val.value
  }
  return out
}

/**
 * @param {string} code
 * @param {string} id
 * @param {PluginOptions} opts
 * @returns {{code: string; snippets: string[]}}
 */
export function transformDirectives(code, id, opts) {
  const { rootAttrName, rootDOMElement, rootStyle } = opts
  const prefix = rootAttrName ? `${rootAttrName}-` : ""
  const ast = parseSync(code, { syntax: "typescript", tsx: true })

  /** @type {{[key: string]: any}} */
  let importMap = {}

  for (const node of ast.body) {
    if (node.type === "ImportDeclaration") {
      const rel = node.source.value
      let source = rel
      if (rel.startsWith(".") || rel.startsWith("/")) {
        const abs = normalizePath(path.resolve(path.dirname(id), rel))
        source = abs
        node.source.value = abs
        node.source.raw = `"${abs}"`
      }
      for (const spec of node.specifiers) {
        if (spec.type === "ImportDefaultSpecifier") {
          importMap[spec.local.value] = { source, importType: "default" }
        } else if (spec.type === "ImportNamespaceSpecifier") {
          importMap[spec.local.value] = { source, importType: "namespace" }
        } else if (spec.type === "ImportSpecifier") {
          const importedName = spec.imported?.value ?? spec.local.value
          importMap[spec.local.value] = {
            source,
            importType: "named",
            importedName,
          }
        }
      }
    }
  }

  /** @type {string[]} */
  let snippets = []

  /**
   * @param {ASTNode} node
   * @returns {ASTNode}
   */
  function visit(node) {
    if (!node || typeof node !== "object") return node

    if (node.type === "JSXElement") {
      const opening = node.opening
      if (opening && Array.isArray(opening.attributes)) {
        const idx = opening.attributes.findIndex(
          /** @param {any} attr */
          (attr) =>
            attr.type === "JSXAttribute" &&
            attr.name.type === "JSXNamespacedName" &&
            attr.name.namespace.value === "client",
        )
        if (idx !== -1) {
          const [directive] = opening.attributes.splice(idx, 1)
          const clientName = directive.name.name.value

          let ssrNode = node
          let snippetNode = node

          if (clientName === "only") {
            const fallback = (node.children || []).find(
              /** @param {any} c */
              (c) =>
                c.type === "JSXElement" &&
                Array.isArray(c.opening.attributes) &&
                c.opening.attributes.some(
                  /** @param {any} a */
                  (a) =>
                    a.type === "JSXAttribute" &&
                    a.name.value === "slot" &&
                    a.value?.value === "fallback",
                ),
            )
            if (fallback) {
              ssrNode = fallback

              const { opening: origOpening, children: origChildren } = node
              const filteredChildren = (origChildren || []).filter(
                /** @param {any} c */
                (c) => c !== fallback,
              )
              snippetNode = {
                ...node,
                opening: origOpening,
                children: filteredChildren,
              }
            } else {
              const frag = {
                type: "JSXFragment",
                span: node.span,
                opening: { type: "JSXOpeningFragment", span: node.span },
                children: [],
                closing: { type: "JSXClosingFragment", span: node.span },
              }
              ssrNode = frag
            }
          }

          let rawJsx = printNode(snippetNode).replace(/;?\s*$/, "")
          let tagNames = new Set()

          /**
           * @param {*} n
           * @returns {void}
           */
          function collect(n) {
            if (!n || typeof n !== "object") return
            if (n.type === "JSXElement") {
              tagNames.add(n.opening.name.value)
            }
            for (const k of Object.keys(n)) {
              const v = n[k]
              if (Array.isArray(v)) v.forEach(collect)
              else if (v && typeof v === "object") collect(v)
            }
          }
          collect(snippetNode)

          let importLines = []

          for (const tag of tagNames) {
            const imp = importMap[tag]
            if (!imp) continue
            if (imp.importType === "default") {
              importLines.push(`import ${tag} from "${imp.source}"`)
            } else if (imp.importType === "namespace") {
              importLines.push(`import * as ${tag} from "${imp.source}"`)
            } else if (imp.importType === "named") {
              const alias =
                imp.importedName !== tag ? `${imp.importedName} as ${tag}` : tag
              importLines.push(`import { ${alias} } from "${imp.source}"`)
            }
          }

          const jsxLines = rawJsx.split(/\r?\n/)
          const snippet = getSnippet(importLines, jsxLines)
          const encoded = encodeSnippet(snippet)

          snippets.push(encoded)

          const directiveNameAttr = {
            type: "JSXAttribute",
            span: directive.span,
            name: {
              type: "Identifier",
              span: directive.name.name.span,
              ctxt: directive.name.name.ctxt,
              optional: false,
              value: `data-${prefix}client-directive`,
            },
            value: {
              type: "StringLiteral",
              span: directive.span,
              value: clientName,
              raw: `"${clientName}"`,
            },
          }

          let paramsValue = ""

          if (!directive.value) {
            paramsValue = ""
          } else if (directive.value.type === "StringLiteral") {
            paramsValue = directive.value.value
          } else if (
            directive.value.type === "JSXExpressionContainer" &&
            directive.value.expression.type === "ObjectExpression"
          ) {
            const obj = evalObjectExpr(directive.value.expression)
            paramsValue = JSON.stringify(obj)
          }

          const directiveParamsAttr = {
            type: "JSXAttribute",
            span: directive.span,
            name: {
              type: "Identifier",
              span: directive.name.name.span,
              ctxt: directive.name.name.ctxt,
              optional: false,
              value: `data-${prefix}client-directive-params`,
            },
            value: {
              type: "StringLiteral",
              span: directive.span,
              value: paramsValue,
              raw: `'${paramsValue}'`,
            },
          }

          /**
           * @param {React.CSSProperties} rootStyle
           * @returns {any}
           */
          function makeStyleProperties(rootStyle) {
            return Object.entries(rootStyle).map(([key, value]) => {
              return {
                type: "KeyValueProperty",
                span: directive.span,
                key: {
                  type: "Identifier",
                  span: directive.name.name.span,
                  ctxt: directive.name.name.ctxt,
                  optional: false,
                  value: key,
                },
                value: {
                  type: "StringLiteral",
                  span: directive.span,
                  value,
                  raw: `"${value}"`,
                },
              }
            })
          }

          const styleAttr = {
            type: "JSXAttribute",
            span: directive.span,
            name: {
              type: "Identifier",
              span: directive.name.name.span,
              ctxt: directive.name.name.ctxt,
              optional: false,
              value: "style",
            },
            value: {
              type: "JSXExpressionContainer",
              span: directive.span,
              expression: {
                type: "ObjectExpression",
                span: directive.span,
                properties: makeStyleProperties(rootStyle),
              },
            },
          }

          const snippetAttr = {
            type: "JSXAttribute",
            span: directive.span,
            name: {
              type: "Identifier",
              span: directive.name.name.span,
              ctxt: directive.name.name.ctxt,
              optional: false,
              value: `data-${prefix}client-snippet`,
            },
            value: {
              type: "StringLiteral",
              span: directive.span,
              value: encoded,
              raw: `"${encoded}"`,
            },
          }

          const targetNode = clientName === "only" ? ssrNode : node
          const wrapperId = { ...opening.name, value: rootDOMElement }
          const wrapperOpening = {
            ...opening,
            name: wrapperId,
            selfClosing: false,
            attributes: [
              directiveNameAttr,
              directiveParamsAttr,
              styleAttr,
              snippetAttr,
            ],
          }
          const wrapperClosing = {
            type: "JSXClosingElement",
            span: node.span,
            name: wrapperId,
          }
          return {
            type: "JSXElement",
            span: node.span,
            opening: wrapperOpening,
            children: [
              visit({
                ...targetNode,
                opening: targetNode.opening,
                children: (targetNode.children || []).map(visit),
              }),
            ],
            closing: wrapperClosing,
          }
        }
      }
    }

    for (const key of Object.keys(node)) {
      const v = node[key]
      if (Array.isArray(v)) node[key] = v.map(visit)
      else if (v && typeof v === "object") node[key] = visit(v)
    }
    return node
  }

  const newAst = visit(ast)
  // @ts-ignore
  return { code: printSync(newAst).code, snippets }
}
