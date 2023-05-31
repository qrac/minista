import { describe, expect, it } from "vitest"

import {
  transformOneComment,
  transformMultiComment,
} from "../../src/transform/comment"

describe("transformOneComment", () => {
  it("Default", () => {
    const result = transformOneComment("test")
    expect(result).toEqual(`<!-- test -->`)
  })
})

describe("transformMultiComment", () => {
  it("Default", () => {
    const result = transformMultiComment(`test
test 2
test 3`)
    expect(result).toEqual(`<!--
  test
  test 2
  test 3
-->`)
  })
})
