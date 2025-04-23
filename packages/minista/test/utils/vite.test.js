import { describe, it, expect } from "vitest"

import { mergeSsrExternal } from "../../src/utils/vite.js"

describe("mergeSsrExternal", () => {
  it("ssr.externalが未定義の場合は渡したモジュールを返す", () => {
    const config = {}
    const result = mergeSsrExternal(config, ["minista"])
    expect(result).toEqual(["minista"])
  })

  it("existing externalが配列でない場合はそのまま返す", () => {
    const config = { ssr: { external: "some-lib" } }
    // @ts-ignore
    const result = mergeSsrExternal(config, ["minista"])
    expect(result).toBe("some-lib")
  })

  it("既存の配列にモジュールをマージする", () => {
    const config = { ssr: { external: ["react", "vue"] } }
    const result = mergeSsrExternal(config, ["minista"])
    expect(result).toEqual(["react", "vue", "minista"])
  })

  it("モジュールが既に存在する場合は重複を避ける", () => {
    const config = { ssr: { external: ["minista", "react"] } }
    const result = mergeSsrExternal(config, ["minista"])
    expect(result).toEqual(["minista", "react"])
  })

  it("複数のモジュールを重複排除して処理する", () => {
    const config = { ssr: { external: ["react"] } }
    const result = mergeSsrExternal(config, ["minista", "react", "vue"])
    expect(result).toEqual(["react", "minista", "vue"])
  })

  it("入力がない場合は空配列を返す", () => {
    const config = {}
    const result = mergeSsrExternal(config)
    expect(result).toEqual([])
  })
})
