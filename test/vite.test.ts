import { describe, expect, it } from "vitest"

import { resolveEntry } from "../src/vite"

describe("resolveEntry", () => {
  it("Test: resolveEntry", () => {
    const result = resolveEntry([
      {
        name: "entry",
        input: "01.ts",
        insertPages: { include: ["**/*"], exclude: [] },
      },
    ])

    //console.log(result)
    expect(result).toEqual({ entry: "01.ts" })
  })
})
