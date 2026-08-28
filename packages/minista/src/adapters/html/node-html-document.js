// @ts-check

import { parse } from "node-html-parser"

/** @typedef {import("node-html-parser").HTMLElement} HTMLElement */
/** @typedef {import("../../core/document/index.js").HtmlDocumentInput} HtmlDocumentInput */
/** @typedef {import("../../core/document/index.js").HtmlElement} HtmlElement */
/** @typedef {import("../../core/document/index.js").HtmlMarkerBinding} HtmlMarkerBinding */
/** @typedef {import("../../core/document/index.js").HtmlMarkerReference} HtmlMarkerReference */
/** @typedef {import("../../core/graph/index.js").FeatureId} FeatureId */

/** @type {WeakMap<NodeHtmlElement, HTMLElement>} */
const nativeElements = new WeakMap()

/** @type {WeakMap<NodeHtmlElement, NodeHtmlDocument>} */
const documentOwners = new WeakMap()

/** @type {WeakMap<NodeHtmlDocument, import("node-html-parser").HTMLElement>} */
const nativeDocuments = new WeakMap()

const htmlDocumentErrorCodes = Object.freeze({
  parse: "MINISTA_HTML_PARSE_FAILED",
  query: "MINISTA_HTML_QUERY_FAILED",
  mutate: "MINISTA_HTML_MUTATION_FAILED",
  serialize: "MINISTA_HTML_SERIALIZE_FAILED",
})

export class NodeHtmlDocumentError extends Error {
  /**
   * @param {unknown} cause
   * @param {import("./node-html-document.js").NodeHtmlDocumentErrorOptions} options
   */
  constructor(cause, options) {
    const detail = cause instanceof Error ? cause.message : String(cause)
    const message = `HTML ${options.operation} failed for ${options.pageId}: ${detail}`
    super(message, cause instanceof Error ? { cause } : undefined)
    this.name = "NodeHtmlDocumentError"
    this.code = htmlDocumentErrorCodes[options.operation]
    this.operation = options.operation
    this.pageId = options.pageId
    this.diagnostic = Object.freeze({
      code: this.code,
      severity: "error",
      message,
      hint: "Check the page HTML and selectors used by the active feature.",
      nodeId: options.pageId,
    })
  }
}

/**
 * @template Result
 * @param {import("./node-html-document.js").NodeHtmlDocumentOperation} operation
 * @param {import("../../core/graph/index.js").PageId} pageId
 * @param {() => Result} task
 * @returns {Result}
 */
function runHtmlDocumentOperation(operation, pageId, task) {
  try {
    return task()
  } catch (error) {
    if (error instanceof NodeHtmlDocumentError) throw error
    throw new NodeHtmlDocumentError(error, { operation, pageId })
  }
}

export class NodeHtmlElement {
  /**
   * @param {HTMLElement} element
   * @param {NodeHtmlDocument} owner
   */
  constructor(element, owner) {
    nativeElements.set(this, element)
    documentOwners.set(this, owner)
  }

  get tagName() {
    return runElementOperation(this, "query", () =>
      getNativeElement(this).tagName.toLowerCase())
  }

  get text() {
    return runElementOperation(this, "query", () => getNativeElement(this).innerText)
  }

  get innerHtml() {
    return runElementOperation(this, "query", () => getNativeElement(this).innerHTML)
  }

  get outerHtml() {
    return runElementOperation(this, "query", () => getNativeElement(this).toString())
  }

  /** @param {string} name */
  getAttribute(name) {
    return runElementOperation(this, "query", () =>
      getNativeElement(this).getAttribute(name))
  }

  /** @param {string} name */
  hasAttribute(name) {
    return runElementOperation(this, "query", () =>
      getNativeElement(this).hasAttribute(name))
  }

  /**
   * @param {string} name
   * @param {string} value
   */
  setAttribute(name, value) {
    runElementOperation(this, "mutate", () =>
      getNativeElement(this).setAttribute(name, value))
  }

  /** @param {string} name */
  removeAttribute(name) {
    runElementOperation(this, "mutate", () =>
      getNativeElement(this).removeAttribute(name))
  }

  /** @param {string} html */
  setInnerHtml(html) {
    runElementOperation(this, "mutate", () => {
      getNativeElement(this).innerHTML = html
    })
  }

  /** @param {string} html */
  appendHtml(html) {
    runElementOperation(this, "mutate", () =>
      getNativeElement(this).insertAdjacentHTML("beforeend", html))
  }

  /** @param {string} html */
  replaceWith(html) {
    runElementOperation(this, "mutate", () =>
      getNativeElement(this).replaceWith(html))
  }

  remove() {
    runElementOperation(this, "mutate", () => getNativeElement(this).remove())
  }
}

/**
 * @template Result
 * @param {NodeHtmlElement} element
 * @param {"query" | "mutate"} operation
 * @param {() => Result} task
 * @returns {Result}
 */
function runElementOperation(element, operation, task) {
  const owner = documentOwners.get(element)
  if (!owner) throw new TypeError("Unknown HTML element adapter.")
  return runHtmlDocumentOperation(operation, owner.pageId, task)
}

/** @param {NodeHtmlElement} element */
function getNativeElement(element) {
  const native = nativeElements.get(element)
  if (!native) throw new TypeError("Unknown HTML element adapter.")
  return native
}

export class NodeHtmlDocument {
  #root
  /** @type {WeakMap<HTMLElement, NodeHtmlElement>} */
  #elements = new WeakMap()
  /** @type {HtmlMarkerBinding[]} */
  #markers = []

  /** @param {HtmlDocumentInput} input */
  constructor(input) {
    this.pageId = input.pageId
    this.#root = runHtmlDocumentOperation("parse", input.pageId, () =>
      parse(input.html, { comment: true }))
    nativeDocuments.set(this, this.#root)
  }

  /** @param {string} selector */
  select(selector) {
    return runHtmlDocumentOperation("query", this.pageId, () =>
      Object.freeze(
        this.#root.querySelectorAll(selector).map((element) => this.#wrap(element)),
      ))
  }

  /**
   * @param {HtmlElement} element
   * @param {HtmlMarkerReference} reference
   */
  bind(element, reference) {
    if (!(element instanceof NodeHtmlElement) || documentOwners.get(element) !== this) {
      throw new TypeError("HTML marker element belongs to another document.")
    }
    const binding = Object.freeze({ ...reference, element })
    this.#markers.push(binding)
    return binding
  }

  /** @param {FeatureId} [featureId] */
  markers(featureId) {
    return Object.freeze(
      this.#markers.filter((marker) => !featureId || marker.featureId === featureId),
    )
  }

  serialize() {
    return runHtmlDocumentOperation("serialize", this.pageId, () =>
      this.#root.toString())
  }

  /** @param {HTMLElement} element */
  #wrap(element) {
    const current = this.#elements.get(element)
    if (current) return current
    const wrapped = new NodeHtmlElement(element, this)
    this.#elements.set(element, wrapped)
    return wrapped
  }
}

/**
 * Adapter内部の追加解析で、同じparse treeを再利用する。
 *
 * @param {import("../../core/document/index.js").HtmlDocument} document
 */
export function getNativeNodeHtmlDocumentRoot(document) {
  if (!(document instanceof NodeHtmlDocument)) {
    throw new TypeError("HTML document is not backed by the Node adapter.")
  }
  const root = nativeDocuments.get(document)
  if (!root) throw new TypeError("Unknown Node HTML document.")
  return root
}

export class NodeHtmlDocumentFactory {
  /** @param {HtmlDocumentInput} input */
  parse(input) {
    return new NodeHtmlDocument(input)
  }
}
