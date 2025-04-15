import { describe, it, expect } from "vitest"

import { mergeSsrExternal } from "../../src/utils/vite.js"

describe("mergeSsrExternal", () => {
  it("returns modules when ssr.external is undefined", () => {
    const config = {}
    const result = mergeSsrExternal(config, ["minista"])
    expect(result).toEqual(["minista"])
  })

  it("returns existing external when not an array", () => {
    const config = { ssr: { external: "some-lib" } }
    // @ts-ignore
    const result = mergeSsrExternal(config, ["minista"])
    expect(result).toBe("some-lib")
  })

  it("merges modules into existing array", () => {
    const config = { ssr: { external: ["react", "vue"] } }
    const result = mergeSsrExternal(config, ["minista"])
    expect(result).toEqual(["react", "vue", "minista"])
  })

  it("avoids duplicates when module already exists", () => {
    const config = { ssr: { external: ["minista", "react"] } }
    const result = mergeSsrExternal(config, ["minista"])
    expect(result).toEqual(["minista", "react"])
  })

  it("handles multiple modules with deduplication", () => {
    const config = { ssr: { external: ["react"] } }
    const result = mergeSsrExternal(config, ["minista", "react", "vue"])
    expect(result).toEqual(["react", "minista", "vue"])
  })

  it("returns empty array if no input", () => {
    const config = {}
    const result = mergeSsrExternal(config)
    expect(result).toEqual([])
  })
})
