import { createElement, Suspense, use } from "react"
import { describe, expect, test } from "vitest"

import {
  ReactRenderToStringRenderer,
  ReactStaticRenderer,
} from "../../../src/adapters/react/index.js"

function AsyncMessage({ value }: { value: Promise<string> }) {
  return createElement("strong", null, use(value))
}

describe("React renderer adapters", () => {
  test("keeps renderToString as a compatibility adapter", async () => {
    const renderer = new ReactRenderToStringRenderer()
    const result = await renderer.render({
      pageId: "page:/",
      url: "/",
      tree: createElement("h1", null, "Hello"),
    })

    expect(result.html).toBe("<h1>Hello</h1>")
  })

  test("uses the React static API and waits for Suspense data", async () => {
    const renderer = new ReactStaticRenderer()
    const result = await renderer.render({
      pageId: "page:/",
      url: "/",
      tree: createElement(
        Suspense,
        { fallback: createElement("span", null, "Loading") },
        createElement(AsyncMessage, { value: Promise.resolve("Ready") }),
      ),
    })

    expect(result.html).toContain("<strong>Ready</strong>")
    expect(result.html).not.toContain("Loading")
  })
})
