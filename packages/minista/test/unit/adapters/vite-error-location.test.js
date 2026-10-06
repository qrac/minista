import { describe, expect, test } from "vitest"

import { getViteErrorLocation } from "../../../src/adapters/vite/error-location.js"

describe("Vite error location adapter", () => {
  test("omits virtual and out-of-project module locations", () => {
    expect(getViteErrorLocation({ id: "\0virtual:test" }, "/project"))
      .toBeUndefined()
    expect(getViteErrorLocation({ id: "/dependency/index.js" }, "/project"))
      .toBeUndefined()
  })

  test("normalizes Windows separators and strips query strings", () => {
    expect(getViteErrorLocation({
      id: "src\\pages\\index.jsx?import",
      loc: { line: 2, column: 0 },
    }, "/project")).toEqual({
      file: "src/pages/index.jsx",
      line: 2,
      column: 0,
    })
  })
})
