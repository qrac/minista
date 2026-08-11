import { describe, expect, test } from "vitest"

import { createAssetEntryId } from "../../src/shared/asset.js"

describe("createAssetEntryId", () => {
  test("creates a path-free stable id", () => {
    const usedIds = new Set()
    const first = createAssetEntryId("src/assets/ct1/style.css", usedIds)
    const second = createAssetEntryId("src/assets/ct1/style.css", usedIds)

    expect(first).toBe("style")
    expect(second).toBe("style2")
    expect(first).not.toContain("/")
  })

  test("keeps same filenames unique", () => {
    const usedIds = new Set()
    expect(createAssetEntryId("ct1/style.css", usedIds)).not.toBe(
      createAssetEntryId("ct2/style.css", usedIds),
    )
  })
})
