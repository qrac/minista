import { describe, expect, test } from "vitest"

import { DiagnosticCollector } from "../../../src/core/index.js"
import {
  discoverRoutes,
  resolvePageNodes,
  sourceFileToRoutePattern,
} from "../../../src/features/ssg/index.js"

const options = { srcBases: ["/src/pages"] }

describe("SSG route discovery", () => {
  test("preserves the documented v4 URL convention", () => {
    expect(sourceFileToRoutePattern("/src/pages/index.tsx", options)).toBe("/")
    expect(
      sourceFileToRoutePattern("/src/pages/blog/[slug].tsx", options),
    ).toBe("/blog/:slug")
    expect(
      sourceFileToRoutePattern("/src/pages/docs/[...all].tsx", options),
    ).toBe("/docs/*")
  })

  test("treats srcBases with and without a leading slash equally", () => {
    const sourceFile = "/src/pages/blog/index.tsx"
    expect(
      sourceFileToRoutePattern(sourceFile, { srcBases: ["src/pages"] }),
    ).toBe(sourceFileToRoutePattern(sourceFile, options))
  })

  test("discovers stable route IDs independent of input order", () => {
    const first = discoverRoutes(
      ["src/pages/z.tsx", "src/pages/index.tsx"],
      options,
    )
    const second = discoverRoutes(
      ["src/pages/index.tsx", "src/pages/z.tsx"],
      options,
    )

    expect(first).toEqual(second)
    expect(first.map(({ route }) => route.id)).toEqual([
      "route:src/pages/index.tsx",
      "route:src/pages/z.tsx",
    ])
  })
})

describe("SSG page resolution", () => {
  test("expands dynamic static data into page nodes", async () => {
    const diagnostics = new DiagnosticCollector()
    const [{ route }] = discoverRoutes(
      ["src/pages/blog/[slug].tsx"],
      options,
    )
    const pages = await resolvePageNodes(
      route!,
      {
        default: () => undefined,
        metadata: { title: "Blog" },
        getStaticData: async () => [
          { paths: { slug: "hello world" }, props: { order: 1 } },
          { paths: { slug: "second" }, props: { order: 2 } },
        ],
      },
      diagnostics,
    )

    expect(pages.map(({ url }) => url)).toEqual([
      "/blog/hello%20world",
      "/blog/second",
    ])
    expect(pages[0]?.props).toEqual({ order: 1 })
    expect(diagnostics.hasErrors()).toBe(false)
  })

  test("reports missing route params as structured diagnostics", async () => {
    const diagnostics = new DiagnosticCollector()
    const [{ route }] = discoverRoutes(
      ["src/pages/blog/[slug].tsx"],
      options,
    )
    const pages = await resolvePageNodes(
      route!,
      { default: () => undefined, getStaticData: async () => ({ props: {} }) },
      diagnostics,
    )

    expect(pages).toEqual([])
    expect(diagnostics.byCode("MINISTA_ROUTE_MISSING_PARAM")).toHaveLength(1)
  })

  test("turns getStaticData failures into diagnostics", async () => {
    const diagnostics = new DiagnosticCollector()
    const [{ route }] = discoverRoutes(["src/pages/index.tsx"], options)
    const pages = await resolvePageNodes(
      route!,
      {
        default: () => undefined,
        getStaticData: async () => {
          throw new Error("network unavailable")
        },
      },
      diagnostics,
    )

    expect(pages).toEqual([])
    expect(diagnostics.byCode("MINISTA_STATIC_DATA_FAILED")[0]?.message).toBe(
      "network unavailable",
    )
  })
})
