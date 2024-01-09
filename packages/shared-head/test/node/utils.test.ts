import { describe, expect, it } from "vitest"

import {
  transformAttrs,
  checkTagsCharset,
  checkTagsViewport,
} from "../../src/node/utils.js"

describe("transformAttrs", () => {
  it("none", () => {
    const result = transformAttrs({})
    expect(result).toEqual("")
  })
  it("one attr", () => {
    const result = transformAttrs({ lang: "en" })
    expect(result).toEqual(`lang="en"`)
  })
  it("two attrs", () => {
    const result = transformAttrs({ lang: "en", "data-color": "auto" })
    expect(result).toEqual(`lang="en" data-color="auto"`)
  })
})

describe("checkTagsCharset", () => {
  it("none", () => {
    const result = checkTagsCharset([])
    expect(result).toEqual(false)
  })
  it("has", () => {
    const result = checkTagsCharset([
      {
        type: "meta",
        key: null,
        props: {
          charset: "UTF-8",
        },
      },
    ])
    expect(result).toEqual(true)
  })
  it("has not", () => {
    const result = checkTagsCharset([
      {
        type: "meta",
        key: null,
        props: {
          name: "viewport",
          content: "width=device-width, initial-scale=1.0",
        },
      },
    ])
    expect(result).toEqual(false)
  })
})

describe("checkTagsViewport", () => {
  it("none", () => {
    const result = checkTagsViewport([])
    expect(result).toEqual(false)
  })
  it("has", () => {
    const result = checkTagsViewport([
      {
        type: "meta",
        key: null,
        props: {
          name: "viewport",
          content: "width=device-width, initial-scale=1.0",
        },
      },
    ])
    expect(result).toEqual(true)
  })
  it("has not", () => {
    const result = checkTagsViewport([
      {
        type: "meta",
        key: null,
        props: {
          charset: "UTF-8",
        },
      },
    ])
    expect(result).toEqual(false)
  })
})
