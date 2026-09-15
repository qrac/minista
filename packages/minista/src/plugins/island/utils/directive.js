// @ts-check

/** @typedef {import('../types.js').PluginOptions} PluginOptions */
/** @typedef {{type: string; start: number; end: number; [key: string]: any}} ASTNode */
/** @typedef {{start: number; end: number; content: string}} Edit */

import path from "node:path"
import { fileURLToPath } from "node:url"
import MagicString from "magic-string"
import { normalizePath } from "vite"

import { encodeSnippet } from "./snippet.js"

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

/** @param {ASTNode} name @returns {string} */
function componentName(name) {
  return name.type === "JSXMemberExpression"
    ? `${componentName(name.object)}.${name.property.name}`
    : name.name
}

/** @param {ASTNode} directive @param {string} code */
function directiveParameters(directive, code) {
  const value = directive.value
  if (!value) return '""'
  if (value.type === "Literal") return JSON.stringify(value.value)
  return code.slice(value.expression.start, value.expression.end)
}

/** @param {string} code @param {string} message */
function transformError(code, message) {
  return Object.assign(new Error(message), {
    diagnostic: { code, severity: "error", message, feature: "feature:island", phase: "render" },
  })
}

/** @param {ASTNode} node @param {Set<string>} names @param {ASTNode | undefined} skip */
function collectJsxNames(node, names, skip) {
  if (node === skip) return
  if (node.type === "JSXElement") {
    const name = componentName(node.openingElement.name)
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
 * Track bindings, not variable values. A shadowed import must never silently
 * hydrate with a different component from the one used by the server.
 * @param {ASTNode} program
 */
function collectLocalBindings(program) {
  /** @type {{name: string, start: number, end: number}[]} */
  const bindings = []
  /** @param {ASTNode | undefined} pattern @param {ASTNode} scope */
  function bind(pattern, scope) {
    if (!pattern) return
    if (pattern.type === "Identifier") bindings.push({ name: pattern.name, start: scope.start, end: scope.end })
    else if (pattern.type === "RestElement") bind(pattern.argument, scope)
    else if (pattern.type === "AssignmentPattern") bind(pattern.left, scope)
    else if (pattern.type === "ArrayPattern") pattern.elements.forEach((/** @type {ASTNode} */ item) => bind(item, scope))
    else if (pattern.type === "ObjectPattern") pattern.properties.forEach((/** @type {ASTNode} */ property) =>
      bind(property.type === "RestElement" ? property.argument : property.value, scope))
  }
  /** @param {ASTNode} node @param {ASTNode} scope @param {ASTNode} functionScope */
  function walk(node, scope, functionScope) {
    if (node.type === "ImportDeclaration") return
    if (node.type === "FunctionDeclaration" || node.type === "ClassDeclaration") bind(node.id, scope)
    if (["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression"].includes(node.type)) {
      scope = functionScope = node
      bind(node.id, scope)
      node.params.forEach((/** @type {ASTNode} */ param) => bind(param, scope))
    } else if (["BlockStatement", "CatchClause", "ForStatement", "ForOfStatement", "ForInStatement", "SwitchStatement"].includes(node.type)) {
      scope = node
      if (node.type === "CatchClause") bind(node.param, scope)
    }
    if (node.type === "VariableDeclaration") {
      node.declarations.forEach((/** @type {ASTNode} */ declaration) => bind(declaration.id, node.kind === "var" ? functionScope : scope))
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.filter(isNode).forEach((child) => walk(child, scope, functionScope))
      else if (isNode(value)) walk(value, scope, functionScope)
    }
  }
  walk(program, program, program)
  return bindings
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

  let boundaryName = "MinistaIslandBoundary"
  while (code.includes(boundaryName)) boundaryName += "_"
  /** @type {Record<string, {source: string; importType: "default" | "namespace" | "named"; importedName?: string}>} */
  const importMap = Object.create(null)

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
  const localBindings = collectLocalBindings(program)

  /** @param {ASTNode} node @param {ASTNode | undefined} fallback */
  function createEntry(node, fallback) {
    /** @param {ASTNode} child */
    function checkBindings(child) {
      if (child === fallback) return
      if (child.type === "JSXElement") {
        const name = componentName(child.openingElement.name)
        const local = name.split(".")[0] ?? name
        if (importMap[local] && localBindings.some((binding) =>
          binding.name === local && binding.start <= child.start && binding.end >= child.end)) {
          throw transformError("MINISTA_ISLAND_COMPONENT_UNRESOLVED", `Island component ${name} shadows a static import.`)
        }
      }
      for (const value of Object.values(child)) {
        if (Array.isArray(value)) value.filter(isNode).forEach(checkBindings)
        else if (isNode(value)) checkBindings(value)
      }
    }
    checkBindings(node)
    const names = new Set()
    collectJsxNames(node, names, fallback)
    const imports = []
    const references = []
    const bindings = new Map()
    for (const name of names) {
      const local = name.split(".")[0] ?? name
      if (/^[a-z]/.test(name) && !name.includes(".")) continue
      const imported = importMap[local]
      if (!imported) {
        throw transformError("MINISTA_ISLAND_COMPONENT_UNRESOLVED",
          `Island component ${name} must come from a static import.`)
      }
      let binding = bindings.get(local)
      if (!binding) {
        binding = `IslandComponent${bindings.size}`
        bindings.set(local, binding)
        if (imported.importType === "default") {
          imports.push(`import ${binding} from ${JSON.stringify(imported.source)}`)
        } else if (imported.importType === "namespace") {
          imports.push(`import * as ${binding} from ${JSON.stringify(imported.source)}`)
        } else {
          imports.push(`import { ${imported.importedName} as ${binding} } from ${JSON.stringify(imported.source)}`)
        }
      }
      references.push({ name, binding: binding + name.slice(local.length) })
    }
    const rootName = componentName(node.openingElement.name)
    const root = references.find(({ name }) => name === rootName)?.binding ?? JSON.stringify(rootName)
    const encoded = encodeSnippet([
      ...imports,
      `export const components = [${references.map(({ binding }) => binding).join(", ")}]`,
      `export default ${root}`,
    ].join("\n"))
    return { encoded, references }
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

    const directives = opening.attributes.filter(isClientDirective)
    if (directives.length !== 1) {
      throw transformError("MINISTA_ISLAND_DIRECTIVE_CONFLICT", "Use one client directive per Island.")
    }
    const clientName = directive.name.name.name
    const fallback = clientName === "only" ? findFallback(node) : undefined
    const key = opening.attributes.find((/** @type {ASTNode} */ attribute) =>
      attribute.type === "JSXAttribute" && attribute.name?.name === "key")
    const { encoded, references } = createEntry(node, fallback)
    snippets.push(encoded)
    // The JSX stays in its original lexical scope and is evaluated once.
    const inner = renderRange(code, node.start, node.end, [
      { start: directive.start, end: directive.end, content: "" },
      ...(key ? [{ start: key.start, end: key.end, content: "" }] : []),
      ...(fallback ? [{ start: fallback.start, end: fallback.end, content: "" }] : []),
    ])
    // Nested boundaries cannot independently hydrate a DOM tree owned by a parent root.
    const checkNested = (/** @type {ASTNode} */ child) => {
      if (child === fallback) return
      if (child !== node && child.type === "JSXElement" &&
        child.openingElement.attributes.some(isClientDirective)) {
        throw transformError("MINISTA_ISLAND_NESTED", "Place client directives on the outermost Island only.")
      }
      for (const value of Object.values(child)) {
        if (Array.isArray(value)) value.filter(isNode).forEach(checkNested)
        else if (isNode(value)) checkNested(value)
      }
    }
    checkNested(node)
    const fallbackCode = fallback
      ? transformJsx(fallback) ?? code.slice(fallback.start, fallback.end)
      : "null"
    return `<${boundaryName} ${key ? code.slice(key.start, key.end) : ""} element={${inner}} components={[${references.map(({ name }) => name).join(", ")}]}` +
      ` options={${JSON.stringify(opts)}} snippet=${JSON.stringify(encoded)}` +
      ` directive=${JSON.stringify(clientName)} parameters={${directiveParameters(directive, code)}}` +
      ` fallback={${fallbackCode}} />`
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
  if (snippets.length) {
    const serverModule = normalizePath(fileURLToPath(new URL("../server.js", import.meta.url)))
    magicString.prepend(`import { IslandBoundary as ${boundaryName} } from ${JSON.stringify(serverModule)}\n`)
  }
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
