import { describe, expect, it } from "vitest"

import { getEsbuildAlias } from "../src/esbuild"

describe("getEsbuildAlias", () => {
  it("Test: getEsbuildAlias", () => {
    const esbuildAlias = [
      {
        find: "react/jsx-runtime",
        replacement: "react/jsx-runtime.js",
      },
    ]
    const userAlias = [
      {
        find: "~",
        replacement: "/src",
      },
    ]
    const result = getEsbuildAlias([esbuildAlias, userAlias])

    //console.log(result)
    expect(result).toEqual({
      "react/jsx-runtime": "react/jsx-runtime.js",
      "~": "/src",
    })
  })
})
