// @ts-check

/** @typedef {import('../types').PluginOptions} PluginOptions */
/** @typedef {{type: string; start: number; end: number; [key: string]: any}} ASTNode */
/** @typedef {{start: number; end: number; content: string}} Edit */

import path from "node:path"
import MagicString from "magic-string"
import { normalizePath } from "vite"

import { getSnippet, encodeSnippet } from "./snippet.js"

/** @param {unknown} value @returns {value is ASTNode} */
function isNode(value) {
  return Boolean(
    value && typeof value === "object" &&
      typeof /** @type {ASTNode} */ (value).type === "string" &&
      typeof /** @type {ASTNode} */ (value).start === "number" &&
      typeof /** @type {ASTNode} */ (value).end === "number",
  )
}

/**
 * @param {string} code
 * @param {number} start
 * @param {number} end
 * @param {readonly Edit[]} edits
 */
function renderRange(code, start, end, edits) {
  let offset = start
  let output = ""
  for (const edit of [...edits].sort((a, b) => a.start - b.start)) {
    if (edit.start < offset || edit.end > end) continue
    output += code.slice(offset, edit.start) + edit.content
    offset = edit.end
  }
  return output + code.slice(offset, end)
}

/** @param {ASTNode} name */
function jsxName(name) {
  if (name.type === "JSXIdentifier") return name.name
  if (name.type === "JSXMemberExpression") return jsxName(name.object)
  return undefined
}

/** @param {ASTNode} attribute */
function isClientDirective(attribute) {
  const name = attribute.name
  return attribute.type === "JSXAttribute" &&
    name?.type === "JSXNamespacedName" &&
    name.namespace?.name === "client"
}

/** @param {ASTNode} attribute */
function isFallbackSlot(attribute) {
  return attribute.type === "JSXAttribute" &&
    attribute.name?.type === "JSXIdentifier" &&
    attribute.name.name === "slot" &&
    attribute.value?.type === "Literal" &&
    attribute.value.value === "fallback"
}

/** @param {ASTNode} node */
function findFallback(node) {
  return (node.children ?? []).find(
    /** @param {ASTNode} child */
    (child) => child.type === "JSXElement" &&
      (child.openingElement?.attributes ?? []).some(isFallbackSlot),
  )
}

/** @param {ASTNode} expression */
function evaluateObject(expression) {
  /** @type {Record<string, string | number | boolean>} */
  const value = {}
  for (const property of expression.properties ?? []) {
    if (property.type !== "Property" || property.computed || property.kind !== "init") continue
    const key = property.key?.name ?? property.key?.value
    const literal = property.value
    if (typeof key !== "string" || literal?.type !== "Literal") continue
    if (typeof literal.value === "string" || typeof literal.value === "number" ||
      typeof literal.value === "boolean") {
      value[key] = literal.value
    }
  }
  return value
}

/** @param {ASTNode} directive */
function directiveParameters(directive) {
  const value = directive.value
  if (!value) return ""
  if (value.type === "Literal" && typeof value.value === "string") return value.value
  if (value.type === "JSXExpressionContainer" &&
    value.expression?.type === "ObjectExpression") {
    return JSON.stringify(evaluateObject(value.expression))
  }
  return ""
}

/** @param {ASTNode} node @param {Set<string>} names @param {ASTNode | undefined} skip */
function collectJsxNames(node, names, skip) {
  if (node === skip) return
  if (node.type === "JSXElement") {
    const name = jsxName(node.openingElement.name)
    if (name) names.add(name)
  }
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      for (const child of value) {
        if (isNode(child)) collectJsxNames(child, names, skip)
      }
    } else if (isNode(value)) {
      collectJsxNames(value, names, skip)
    }
  }
}

/**
 * @param {string} code
 * @param {string} id
 * @param {PluginOptions} opts
 * @param {unknown} program
 * @returns {{code: string; map: string; snippets: string[]}}
 */
export function transformDirectives(code, id, opts, program) {
  if (!isNode(program) || program.type !== "Program") {
    throw new TypeError("Rolldown parser did not return a Program AST")
  }

  const { rootAttrName, rootDOMElement, rootStyle } = opts
  const prefix = rootAttrName ? `${rootAttrName}-` : ""
  /** @type {Record<string, {source: string; importType: "default" | "namespace" | "named"; importedName?: string}>} */
  const importMap = {}

  for (const node of program.body ?? []) {
    if (node.type !== "ImportDeclaration" || node.importKind === "type") continue
    const relativeSource = node.source.value
    if (typeof relativeSource !== "string") continue
    const source = relativeSource.startsWith(".") || relativeSource.startsWith("/")
      ? normalizePath(path.resolve(path.dirname(id), relativeSource))
      : relativeSource
    for (const specifier of node.specifiers ?? []) {
      if (specifier.importKind === "type") continue
      const local = specifier.local?.name
      if (!local) continue
      if (specifier.type === "ImportDefaultSpecifier") {
        importMap[local] = { source, importType: "default" }
      } else if (specifier.type === "ImportNamespaceSpecifier") {
        importMap[local] = { source, importType: "namespace" }
      } else if (specifier.type === "ImportSpecifier") {
        importMap[local] = {
          source,
          importType: "named",
          importedName: specifier.imported?.name ?? specifier.imported?.value ?? local,
        }
      }
    }
  }

  /** @type {string[]} */
  const snippets = []
  const magicString = new MagicString(code)

  /** @param {ASTNode} node @param {ASTNode} directive @param {ASTNode | undefined} fallback */
  function createSnippet(node, directive, fallback) {
    /** @type {Edit[]} */
    const edits = [{ start: directive.start, end: directive.end, content: "" }]
    if (fallback) edits.push({ start: fallback.start, end: fallback.end, content: "" })
    const rawJsx = renderRange(code, node.start, node.end, edits).trim()
    const names = new Set()
    collectJsxNames(node, names, fallback)
    const imports = []
    for (const name of names) {
      const imported = importMap[name]
      if (!imported) continue
      if (imported.importType === "default") {
        imports.push(`import ${name} from ${JSON.stringify(imported.source)}`)
      } else if (imported.importType === "namespace") {
        imports.push(`import * as ${name} from ${JSON.stringify(imported.source)}`)
      } else {
        const binding = imported.importedName !== name
          ? `${imported.importedName} as ${name}`
          : name
        imports.push(`import { ${binding} } from ${JSON.stringify(imported.source)}`)
      }
    }
    return encodeSnippet(getSnippet(imports, rawJsx.split(/\r?\n/)))
  }

  /** @param {ASTNode} node */
  function transformDescendants(node) {
    /** @type {Edit[]} */
    const edits = []
    /** @param {ASTNode} child */
    function collect(child) {
      const transformed = transformJsx(child)
      if (transformed !== undefined) {
        edits.push({ start: child.start, end: child.end, content: transformed })
        return
      }
      for (const value of Object.values(child)) {
        if (Array.isArray(value)) {
          for (const nested of value) if (isNode(nested)) collect(nested)
        } else if (isNode(value)) {
          collect(value)
        }
      }
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) {
        for (const child of value) if (isNode(child)) collect(child)
      } else if (isNode(value)) {
        collect(value)
      }
    }
    return edits
  }

  /** @param {ASTNode} node @returns {string | undefined} */
  function transformJsx(node) {
    if (node.type !== "JSXElement" && node.type !== "JSXFragment") return undefined
    const opening = node.openingElement
    const directive = opening?.attributes?.find(isClientDirective)
    if (!directive) {
      const edits = transformDescendants(node)
      return edits.length > 0 ? renderRange(code, node.start, node.end, edits) : undefined
    }

    const clientName = directive.name.name.name
    const fallback = clientName === "only" ? findFallback(node) : undefined
    const encoded = createSnippet(node, directive, fallback)
    snippets.push(encoded)

    let inner = ""
    if (clientName === "only") {
      if (fallback) {
        const edits = transformDescendants(fallback)
        inner = edits.length > 0
          ? renderRange(code, fallback.start, fallback.end, edits)
          : code.slice(fallback.start, fallback.end)
      }
    } else {
      inner = renderRange(code, node.start, node.end, [
        { start: directive.start, end: directive.end, content: "" },
        ...transformDescendants(node),
      ])
    }

    const params = directiveParameters(directive)
    const attributes = [
      `data-${prefix}client-directive=${JSON.stringify(clientName)}`,
      `data-${prefix}client-directive-params={${JSON.stringify(params)}}`,
      `style={${JSON.stringify(rootStyle)}}`,
      `data-${prefix}client-snippet=${JSON.stringify(encoded)}`,
    ].join(" ")
    return `<${rootDOMElement} ${attributes}>${inner}</${rootDOMElement}>`
  }

  /** @param {ASTNode} node */
  function visit(node) {
    if (node.type === "JSXElement" || node.type === "JSXFragment") {
      const transformed = transformJsx(node)
      if (transformed !== undefined) {
        magicString.overwrite(node.start, node.end, transformed)
        return
      }
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) {
        for (const child of value) if (isNode(child)) visit(child)
      } else if (isNode(value)) {
        visit(value)
      }
    }
  }

  visit(program)
  return {
    code: magicString.toString(),
    map: magicString.generateMap({
      hires: true,
      source: id,
      includeContent: true,
    }).toString(),
    snippets,
  }
}
