import { describe, expect, it } from "vitest"

import { resolveEntry } from "../src/vite"

describe("resolveEntry", () => {
  it("Test: resolveEntry", () => {
    const result = resolveEntry("entry.js")

    //console.log(result)
    expect(result).toEqual({ entry: "entry.js" })
  })
})
