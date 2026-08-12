import { createElement, Fragment } from "react"
import { describe, expect, test } from "vitest"

import { ReactStaticRenderer } from "../../../src/adapters/react/index.js"
import { Head } from "../../../src/head.js"
import {
  renderHtmlDocument,
  transformHtml,
} from "../../../src/plugins/ssg/utils/html.js"

/** @typedef {import("../../../src/plugins/ssg/types.js").ResolvedLayout} ResolvedLayout */
/** @typedef {import("../../../src/plugins/ssg/types.js").ResolvedPage} ResolvedPage */

describe("transformHtml", () => {
  test("renders the page and Head side effects exactly once", async () => {
    let renderCount = 0
    function Page() {
      renderCount += 1
      return createElement(
        Fragment,
        null,
        createElement(Head, {
          title: "Document title",
          htmlAttributes: { lang: "en" },
          bodyAttributes: { class: "page" },
        }),
        createElement("h1", null, "Hello"),
      )
    }

    const resolvedLayout = /** @type {ResolvedLayout} */ (
      /** @type {unknown} */ ({
        staticData: { props: {} },
        metadata: {},
      })
    )
    const resolvedPage = /** @type {ResolvedPage} */ (
      /** @type {unknown} */ ({
        url: "/",
        component: Page,
        staticData: { props: {} },
        metadata: {},
      })
    )

    const html = await transformHtml({ resolvedLayout, resolvedPage })

    expect(renderCount).toBe(1)
    expect(html).toContain('<html lang="en">')
    expect(html).toContain('<body class="page">')
    expect(html).toContain("<title>Document title</title>")
    expect(html).toContain("<h1>Hello</h1>")
  })

  test("supports the React static renderer without changing Head composition", async () => {
    function Page() {
      return createElement(
        Fragment,
        null,
        createElement(Head, { title: "Static title" }),
        createElement("p", null, "Static content"),
      )
    }
    const resolvedLayout = /** @type {ResolvedLayout} */ (
      /** @type {unknown} */ ({
        staticData: { props: {} },
        metadata: {},
      })
    )
    const resolvedPage = /** @type {ResolvedPage} */ (
      /** @type {unknown} */ ({
        url: "/static/",
        component: Page,
        staticData: { props: {} },
        metadata: {},
      })
    )

    const document = await renderHtmlDocument(
      { resolvedLayout, resolvedPage },
      new ReactStaticRenderer(),
    )
    const html = document.serialize()

    expect(html.match(/<!doctype html>/gi)).toHaveLength(1)
    expect(html).toContain("<title>Static title</title>")
    expect(html).toContain("<p>Static content</p>")
  })
})
