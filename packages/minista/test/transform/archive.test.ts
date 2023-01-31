import { describe, expect, it } from "vitest"

import { getArchiveTag } from "../../src/transform/archive"

describe("getArchiveTag", () => {
  it("Default", () => {
    const result = getArchiveTag({
      outDir: "/",
      outName: "archive",
      format: "zip",
    })
    expect(result).toEqual(
      `<a class="minista-delivery-button" href="/archive.zip" download>archive.zip</a>`
    )
  })

  it("Custom button", () => {
    const result = getArchiveTag({
      outDir: "/",
      outName: "archive",
      format: "zip",
      button: {
        title: "Download",
        color: "blue",
      },
    })
    expect(result).toEqual(
      `<a class="minista-delivery-button" href="/archive.zip" style="background-color: blue;" download>Download</a>`
    )
  })
})
