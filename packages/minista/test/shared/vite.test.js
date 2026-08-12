import { describe, it, expect } from "vitest"

import {
  mergeSsrExternal,
  mergeRolldownExternal,
  mergeSsrNoExternal,
  mergeAlias,
} from "../../src/shared/vite.js"

describe("mergeRolldownExternal", () => {
  it("adds modules without discarding existing entries", () => {
    expect(mergeRolldownExternal(["react", /legacy/], ["minista/head", "react"]))
      .toEqual(["react", /legacy/, "minista/head"])
  })

  it("composes an external predicate", async () => {
    const external = mergeRolldownExternal(
      (source) => source === "react",
      ["minista/head"],
    )

    expect(typeof external).toBe("function")
    if (typeof external !== "function") return
    expect(await external("react", undefined, false)).toBe(true)
    expect(await external("minista/head", undefined, false)).toBe(true)
    expect(await external("other", undefined, false)).toBe(false)
  })
})

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

describe("mergeSsrNoExternal", () => {
  it("ssr.noExternalが未定義の場合は渡したモジュールを返す", () => {
    const config = {}
    const result = mergeSsrNoExternal(config, ["minista"])
    expect(result).toEqual(["minista"])
  })

  it("ssr.noExternalがtrueの場合はtrueをそのまま返す", () => {
    const config = { ssr: { noExternal: true } }
    const result = mergeSsrNoExternal(config, ["minista"])
    expect(result).toBe(true)
  })

  it("existing noExternalが配列でない場合はそのまま返す", () => {
    const config = { ssr: { noExternal: "some-lib" } }
    // @ts-ignore テスト用に不正な型を入れる
    const result = mergeSsrNoExternal(config, ["minista"])
    expect(result).toBe("some-lib")
  })

  it("既存の配列にモジュールをマージする", () => {
    const config = { ssr: { noExternal: ["react", "vue"] } }
    const result = mergeSsrNoExternal(config, ["minista"])
    expect(result).toEqual(["react", "vue", "minista"])
  })

  it("モジュールが既に存在する場合は重複を避ける", () => {
    const config = { ssr: { noExternal: ["minista", "react"] } }
    const result = mergeSsrNoExternal(config, ["minista"])
    expect(result).toEqual(["minista", "react"])
  })

  it("複数のモジュールを重複排除して処理する", () => {
    const config = { ssr: { noExternal: ["react"] } }
    const result = mergeSsrNoExternal(config, ["minista", "react", "vue"])
    expect(result).toEqual(["react", "minista", "vue"])
  })

  it("入力がない場合は空配列を返す", () => {
    const config = {}
    const result = mergeSsrNoExternal(config)
    expect(result).toEqual([])
  })
})

describe("mergeAlias", () => {
  it("config.resolve.alias が未定義の場合は渡した aliases のみを返す", () => {
    const config = {}
    const aliases = [{ find: "foo", replacement: "/src/foo" }]
    const result = mergeAlias(config, aliases)
    expect(result).toEqual(aliases)
  })

  it("既存の alias 配列とマージし、重複する find はスキップする", () => {
    const config = {
      resolve: {
        alias: [{ find: "a", replacement: "/path/to/a" }],
      },
    }
    const aliases = [
      { find: "b", replacement: "/path/to/b" },
      { find: "a", replacement: "/path/to/a-new" },
    ]
    const result = mergeAlias(config, aliases)
    expect(result).toEqual([
      { find: "a", replacement: "/path/to/a" },
      { find: "b", replacement: "/path/to/b" },
    ])
  })

  it("config.resolve.alias がオブジェクトレコードの場合もマージできる", () => {
    const config = {
      resolve: {
        alias: {
          x: "/src/x",
          y: "/src/y",
        },
      },
    }
    const aliases = [
      { find: "z", replacement: "/src/z" },
      { find: "x", replacement: "/src/x-new" },
    ]
    const result = mergeAlias(config, aliases)
    expect(result).toEqual([
      { find: "x", replacement: "/src/x" },
      { find: "y", replacement: "/src/y" },
      { find: "z", replacement: "/src/z" },
    ])
  })

  it("既存の find のみの場合は追加しない", () => {
    const config = {
      resolve: {
        alias: [{ find: "foo", replacement: "/foo" }],
      },
    }
    const aliases = [{ find: "foo", replacement: "/foo-new" }]
    const result = mergeAlias(config, aliases)
    expect(result).toEqual([{ find: "foo", replacement: "/foo" }])
  })
})
