import { afterEach, expect, test, vi } from "vitest"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { Search } from "../../../src/plugins/search/components/search.js"

// Drive the component's hooks without adding a browser DOM dependency.
const hooks = vi.hoisted(() => ({
  cursor: 0,
  dirty: false,
  /** @type {any[]} */
  slots: [],
  /** @type {Function[]} */
  effects: [],
}))
vi.mock("react", async (importOriginal) => ({
  ...await importOriginal(),
  /** @param {any} initial */
  useState(initial) {
    const i = hooks.cursor++
    if (!(i in hooks.slots)) hooks.slots[i] = initial
    return [hooks.slots[i], /** @param {any} value */ (value) => {
      if (!Object.is(hooks.slots[i], value)) {
        hooks.slots[i] = value
        hooks.dirty = true
      }
    }]
  },
  /** @param {any} initial */
  useRef(initial) {
    const i = hooks.cursor++
    return hooks.slots[i] ??= { current: initial }
  },
  /** @param {Function} effect @param {any[]} deps */
  useEffect(effect, deps) {
    const i = hooks.cursor++
    const previous = hooks.slots[i]
    if (!previous || deps.some((dep, j) => !Object.is(dep, previous[j]))) {
      hooks.slots[i] = deps
      hooks.effects.push(effect)
    }
  },
}))
afterEach(() => {
  hooks.slots = []
  hooks.effects = []
  vi.unstubAllGlobals()
})

function render() {
  let tree
  let renders = 0
  do {
    if (++renders > 20) throw new Error("Component did not settle")
    hooks.cursor = 0
    hooks.dirty = false
    tree = Search({ minHitLength: 1, field: { clearElement: createElement("button", null, "Clear") } })
    hooks.effects.splice(0).forEach((effect) => effect())
  } while (hooks.dirty)
  return /** @type {import("react").ReactElement<any>} */ (tree)
}

/** @param {ReturnType<typeof render>} tree @param {string} value */
function input(tree, value) {
  tree.props.children[0].props.children[1].props.onChange({ target: { value } })
  return render()
}

function deferredIndex() {
  /** @type {(value: any) => void} */
  let resolve = () => {}
  const promise = new Promise((done) => { resolve = done })
  const fetch = vi.fn(() => promise)
  vi.stubGlobal("fetch", fetch)
  return { fetch, resolve: async () => {
    const words = ["C++", "Ccc", "open(", "openX", "[tag", "a.b", "axb", "path\\file", "a|b"]
    resolve({ json: async () => ({
      words, hits: words.map((_, i) => i),
      pages: words.map((_, i) => ({ url: `/p${i}`, title: [i], content: [i], toc: [] })),
    }) })
    await promise
    await Promise.resolve()
  } }
}

test.each(["C++", "open(", "[tag", "a.b", "path\\file", "a|b"])(
  "searches and highlights %s literally after the first index fetch", async (query) => {
    const index = deferredIndex()
    let tree = input(render(), query)
    expect(renderToStaticMarkup(tree)).not.toContain("<li>")
    await index.resolve()
    tree = render()
    const html = renderToStaticMarkup(tree)
    expect(html).toContain(`<mark>${query}</mark>`)
    expect(html.match(/<li>/g)).toHaveLength(1)
    expect(index.fetch).toHaveBeenCalledTimes(1)
  },
)

test("uses the latest input while loading and matches without case sensitivity", async () => {
  const index = deferredIndex()
  let tree = input(render(), "C++")
  tree = input(tree, "OPEN(")
  await index.resolve()
  const html = renderToStaticMarkup(render())
  expect(html).toContain("<mark>open(</mark>")
  expect(html).not.toContain("<mark>C++</mark>")
  expect(index.fetch).toHaveBeenCalledTimes(1)
})

test("does not restore results when cleared during index loading", async () => {
  vi.stubGlobal("requestAnimationFrame", /** @param {Function} callback */ (callback) => callback())
  const index = deferredIndex()
  const tree = input(render(), "C++")
  tree.props.children[0].props.children[2].props.onClick({ preventDefault() {} })
  render()
  await index.resolve()
  expect(renderToStaticMarkup(render())).not.toContain("<li>")
})
