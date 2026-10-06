import { createElement, Suspense, use, useId } from "react"
import { describe, expect, test } from "vitest"

import {
  ReactRenderToStringRenderer,
  ReactStaticRenderer,
} from "../../../src/adapters/react/index.js"

function AsyncMessage({ value }: { value: Promise<string> }) {
  return createElement("strong", null, use(value))
}

function IdentifiedImage() {
  const id = useId()
  return createElement(
    "main",
    null,
    createElement("label", { htmlFor: id }, "Image"),
    createElement("img", { id, src: "/image.png" }),
  )
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

  test("keeps useId and image preload output compatible", async () => {
    const input = {
      pageId: "page:/",
      url: "/",
      tree: createElement(IdentifiedImage),
    }
    const compatibility = await new ReactRenderToStringRenderer().render(input)
    const current = await new ReactStaticRenderer().render(input)

    expect(current.html).toBe(compatibility.html)
    expect(current.html).toContain('<link rel="preload" as="image"')
    expect(current.html).toMatch(/for="([^"]+)"/)
  })

  test("rejects render errors for lifecycle diagnostics", async () => {
    function BrokenPage(): never {
      throw new Error("render exploded")
    }

    await expect(
      new ReactStaticRenderer().render({
        pageId: "page:/broken",
        url: "/broken",
        tree: createElement(BrokenPage),
      }),
    ).rejects.toThrow("render exploded")
  })
})
