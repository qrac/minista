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

  test("uses a Layout html root as the document and applies Head afterwards", async () => {
    /** @param {import("../../../src/plugins/ssg/types.js").LayoutProps} props */
    function Layout({ children }) {
      return createElement(
        "html",
        { lang: "fr", "data-layout": "document" },
        createElement(
          "head",
          null,
          createElement("meta", { charSet: "shift_jis" }),
          createElement("meta", { name: "viewport", content: "layout" }),
          createElement("title", null, "Layout title"),
          createElement("link", { rel: "icon", href: "/favicon.svg" }),
        ),
        createElement("body", { className: "layout" }, children),
      )
    }
    function Page() {
      return createElement(
        Fragment,
        null,
        createElement(
          Head,
          {
            title: "Page title",
            htmlAttributes: { lang: "en", dir: "ltr" },
            bodyAttributes: { "data-page": "index" },
          },
          createElement("meta", { charSet: "UTF-8" }),
          createElement("meta", {
            name: "viewport",
            content: "width=device-width, initial-scale=2",
          }),
          createElement("meta", { name: "description", content: "Page" }),
        ),
        createElement("main", null, "Document content"),
      )
    }
    const resolvedLayout = /** @type {ResolvedLayout} */ (
      /** @type {unknown} */ ({
        component: Layout,
        staticData: { props: {} },
        metadata: {},
      })
    )
    const resolvedPage = /** @type {ResolvedPage} */ (
      /** @type {unknown} */ ({
        url: "/document/",
        component: Page,
        staticData: { props: {} },
        metadata: {},
      })
    )

    const html = await transformHtml({ resolvedLayout, resolvedPage })

    expect(html.match(/<!doctype html>/gi)).toHaveLength(1)
    expect(html.match(/<html/g)).toHaveLength(1)
    expect(html.match(/<head/g)).toHaveLength(1)
    expect(html.match(/<body/g)).toHaveLength(1)
    expect(html).toContain('<html lang="en" data-layout="document" dir="ltr">')
    expect(html).toContain('<body class="layout" data-page="index">')
    expect(html).toContain("<title>Page title</title>")
    expect(html).not.toContain("Layout title")
    expect(html.match(/charset=/g)).toHaveLength(1)
    expect(html).toContain('charset="UTF-8"')
    expect(html.match(/name="viewport"/g)).toHaveLength(1)
    expect(html).toContain("initial-scale=2")
    expect(html).toContain('<link rel="icon" href="/favicon.svg">')
    expect(html).toContain("<main>Document content</main>")
    const headHtml = html.slice(html.indexOf("<head>"), html.indexOf("</head>"))
    expect(headHtml.indexOf('meta charset="UTF-8"')).toBeLessThan(
      headHtml.indexOf('meta name="viewport"'),
    )
    expect(headHtml.indexOf('meta name="viewport"')).toBeLessThan(
      headHtml.indexOf("<title>"),
    )
  })

  test("keeps a document Layout head when Head does not override it", async () => {
    /** @param {import("../../../src/plugins/ssg/types.js").LayoutProps} props */
    function Layout({ children }) {
      return createElement(
        "html",
        { lang: "de" },
        createElement("head", null, createElement("title", null, "Layout title")),
        createElement("body", null, children),
      )
    }
    const resolvedLayout = /** @type {ResolvedLayout} */ (
      /** @type {unknown} */ ({
        component: Layout,
        staticData: { props: {} },
        metadata: {},
      })
    )
    const resolvedPage = /** @type {ResolvedPage} */ (
      /** @type {unknown} */ ({
        url: "/layout-head/",
        component: () => createElement("main", null, "Content"),
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
    expect(html).toContain('<html lang="de">')
    expect(html).toContain("<title>Layout title</title>")
    expect(html).toContain('meta charset="UTF-8"')
    expect(html).toContain('meta name="viewport"')
    const headHtml = html.slice(html.indexOf("<head>"), html.indexOf("</head>"))
    expect(headHtml).toMatch(
      /^<head><meta charset="UTF-8"><meta name="viewport"/,
    )
  })

  test("orders default charset and viewport before Head tags", async () => {
    function Page() {
      return createElement(
        Fragment,
        null,
        createElement(
          Head,
          null,
          createElement("meta", { property: "og:type", content: "website" }),
        ),
        createElement("main", null, "Content"),
      )
    }
    const resolvedLayout = /** @type {ResolvedLayout} */ (
      /** @type {unknown} */ ({ staticData: { props: {} }, metadata: {} })
    )
    const resolvedPage = /** @type {ResolvedPage} */ (
      /** @type {unknown} */ ({
        url: "/ordered-head/",
        component: Page,
        staticData: { props: {} },
        metadata: {},
      })
    )

    const html = await transformHtml({ resolvedLayout, resolvedPage })
    const headHtml = html.slice(html.indexOf("<head>"), html.indexOf("</head>"))

    expect(headHtml).toMatch(
      /^<head><meta charset="UTF-8"><meta name="viewport"[^>]*><meta property="og:type"/,
    )
  })
})
