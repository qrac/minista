import { describe, expect, it } from "vitest"

import { transformSearch } from "../../src/transform/search"
import { resolveConfig } from "../../src/config"

describe("transformSearch", () => {
  it("Default", async () => {
    const config = await resolveConfig({})
    const result = await transformSearch({
      ssgPages: [
        {
          fileName: "index.html",
          path: "/",
          title: "",
          html: `<title>title</title><div data-search>body</div>`,
        },
      ],
      config,
    })

    //console.log(result)
    expect(result).toEqual({
      words: [" ", "body", "title"],
      hits: [1, 2],
      pages: [
        {
          path: "/",
          title: [2],
          toc: [],
          content: [1],
        },
      ],
    })
  })

  it("Toc", async () => {
    const config = await resolveConfig({})
    const result = await transformSearch({
      ssgPages: [
        {
          fileName: "index.html",
          path: "/",
          title: "",
          html: `<title>title</title><div data-search><h1 id='heading'>heading</h1>body</div>`,
        },
      ],
      config,
    })

    //console.log(result)
    expect(result).toEqual({
      words: [" ", "body", "heading", "title"],
      hits: [1, 2, 3],
      pages: [
        {
          path: "/",
          title: [3],
          toc: [[0, "heading"]],
          content: [2, 1],
        },
      ],
    })
  })
})
