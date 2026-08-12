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
    return getNativeElement(this).tagName.toLowerCase()
  }

  get text() {
    return getNativeElement(this).innerText
  }

  get innerHtml() {
    return getNativeElement(this).innerHTML
  }

  /** @param {string} name */
  getAttribute(name) {
    return getNativeElement(this).getAttribute(name)
  }

  /** @param {string} name */
  hasAttribute(name) {
    return getNativeElement(this).hasAttribute(name)
  }

  /**
   * @param {string} name
   * @param {string} value
   */
  setAttribute(name, value) {
    getNativeElement(this).setAttribute(name, value)
  }

  /** @param {string} name */
  removeAttribute(name) {
    getNativeElement(this).removeAttribute(name)
  }

  /** @param {string} html */
  setInnerHtml(html) {
    getNativeElement(this).innerHTML = html
  }

  /** @param {string} html */
  appendHtml(html) {
    getNativeElement(this).insertAdjacentHTML("beforeend", html)
  }

  /** @param {string} html */
  replaceWith(html) {
    getNativeElement(this).replaceWith(html)
  }

  remove() {
    getNativeElement(this).remove()
  }
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
    this.#root = parse(input.html, { comment: true })
    nativeDocuments.set(this, this.#root)
  }

  /** @param {string} selector */
  select(selector) {
    return Object.freeze(
      this.#root.querySelectorAll(selector).map((element) => this.#wrap(element)),
    )
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
    return this.#root.toString()
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
