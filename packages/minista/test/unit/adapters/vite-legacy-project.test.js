import { describe, expect, test } from "vitest"
import { createElement } from "react"

import { resolveLegacySsgProject } from "../../../src/adapters/vite/legacy-ssg-project.js"

/** @typedef {import("../../../src/plugins/ssg/types.js").PageComponent} PageComponent */

const Page = /** @type {PageComponent} */ (
  /** @type {unknown} */ (() => createElement("div"))
)

describe("resolveLegacySsgProject", () => {
  test("projects imported page modules through the Route/Page Graph", async () => {
    const result = await resolveLegacySsgProject(
      {
        "/src/pages/index.jsx": {
          default: Page,
          metadata: { title: "Home" },
        },
        "/src/pages/posts/[slug].jsx": {
          default: Page,
          getStaticData: async () => [
            { paths: { slug: "one" }, props: { order: 1 } },
            { paths: { slug: "two" }, props: { order: 2 } },
          ],
        },
      },
      { srcBases: ["/src/pages"] },
    )

    expect(result.diagnostics).toEqual([])
    expect(result.graph.routes.size).toBe(2)
    expect(result.graph.pages.size).toBe(3)
    expect(result.pages.map(({ url }) => url)).toEqual([
      "/",
      "/posts/one",
      "/posts/two",
    ])
    expect(result.pages[1].staticData.props).toEqual({ order: 1 })
  })

  test("returns a structured diagnostic for a missing dynamic param", async () => {
    const result = await resolveLegacySsgProject(
      {
        "/src/pages/[slug].jsx": {
          default: Page,
          getStaticData: async () => ({ props: {} }),
        },
      },
      { srcBases: ["/src/pages"] },
    )

    expect(result.pages).toEqual([])
    expect(result.diagnostics[0]).toMatchObject({
      code: "MINISTA_ROUTE_MISSING_PARAM",
      severity: "error",
      phase: "resolve",
    })
  })
})
