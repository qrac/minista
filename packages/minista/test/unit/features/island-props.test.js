import { expect, test, vi } from "vitest"
import { createElement, Fragment, isValidElement } from "react"
import { renderToString } from "react-dom/server"
import { parse } from "node-html-parser"
import { deserializeIslandProps, serializeIslandProps } from "../../../src/plugins/island/props.js"
import { IslandBoundary } from "../../../src/plugins/island/server.js"

const adapter = { createElement, fragment: Fragment, isElement: isValidElement }
/** @type {import("../../../src/plugins/island/types.js").PluginOptions} */
const options = { useSplitPages: true, outName: "island-[index]", rootAttrName: "test", rootDOMElement: "span", rootStyle: { display: "contents" } }
/** @param {string | undefined} source @param {any[]} [components] */
const restore = (source, components = []) => deserializeIslandProps(source ?? "", components, adapter)

test("props round-trip preserves undefined, sparse arrays and keys without executing object hooks", () => {
  const props = { text: '</script><script>alert("x")</script>&\u2028', nested: [null, undefined, , { value: -0 }], tag: ["undefined"] }
  Object.defineProperty(props, "__proto__", { value: { polluted: true }, enumerable: true })
  const result = restore(serializeIslandProps(props, [], adapter))
  expect(result).toEqual(props)
  expect(Object.hasOwn(result, "__proto__")).toBe(true)
  expect(Object.getPrototypeOf(result)).toBe(Object.prototype)
  expect(2 in result.nested).toBe(false)
  expect(Object.is(result.nested[3].value, -0)).toBe(true)
})

test.each([() => {}, Symbol("value"), 1n, NaN, Infinity, new Date(), new Map(), /x/])(
  "rejects unsupported props without silently losing values: %s", (value) => {
    expect(() => serializeIslandProps({ options: { value } }, [], adapter)).toThrow(expect.objectContaining({
      diagnostic: expect.objectContaining({ code: "MINISTA_ISLAND_PROPS_UNSUPPORTED", message: expect.stringContaining("props.options.value") }),
    }))
  },
)

test("rejects cycles and accessors but allows repeated values", () => {
  /** @type {{a: number, self?: unknown}} */
  const value = { a: 1 }
  expect(restore(serializeIslandProps({ a: value, b: value }, [], adapter))).toEqual({ a: value, b: value })
  value.self = value
  expect(() => serializeIslandProps(value, [], adapter)).toThrow("props.self: circular")
  const get = vi.fn()
  expect(() => serializeIslandProps({ get value() { return get() } }, [], adapter)).toThrow("accessors")
  expect(get).not.toHaveBeenCalled()
})

test("SSR instances carry their own escaped values and JSX children with component identity", () => {
  /** @param {{value: number}} props */
  const Child = ({ value }) => createElement("button", null, value)
  const components = [Child]
  const propsList = [3, 7].map((count) => ({
    title: '"<&>\' 日本語', children: createElement(Fragment, null, createElement(Child, { key: "child", value: count })),
  }))
  const html = propsList.map((props) => renderToString(createElement(IslandBoundary, {
    element: createElement("div", props), components, options,
    snippet: "same-component", directive: "load", parameters: "", fallback: null,
  }))).join("")
  const roots = parse(html).querySelectorAll("[data-test-client-props]")
  expect(roots).toHaveLength(2)
  roots.forEach((root, index) => {
    const props = restore(root.getAttribute("data-test-client-props"), components)
    expect(props.title).toBe(propsList[index].title)
    expect(props.children.props.children.type).toBe(Child)
    expect(props.children.props.children.key).toBe("child")
    expect(renderToString(createElement("div", props))).toBe(root.innerHTML)
  })
})

test("client:only serializes props without rendering the body and excludes fallback from data", () => {
  const Component = vi.fn(() => { throw new Error("browser only") })
  const html = renderToString(createElement(IslandBoundary, {
    element: createElement(Component, { count: 4 }), components: [Component], options,
    snippet: "only", directive: "only", parameters: "", fallback: createElement("p", null, "Loading"),
  }))
  const root = parse(html).querySelector("span")
  if (!root) throw new Error("Missing Island root")
  expect(Component).not.toHaveBeenCalled()
  expect(root.innerHTML).toBe("<p>Loading</p>")
  expect(restore(root.getAttribute("data-test-client-props"))).toEqual({ count: 4 })
})

test.each(['{}', '{"schemaVersion":2,"props":null}', '{"schemaVersion":1,"props":["element",["component",100],null,["object",[]]]}', 'broken']) (
  "rejects invalid client payload: %s", (payload) => {
    expect(() => restore(payload)).toThrow(expect.objectContaining({ diagnostic: expect.objectContaining({ code: "MINISTA_ISLAND_PROPS_INVALID" }) }))
  },
)
