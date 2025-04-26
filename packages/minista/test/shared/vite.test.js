import { describe, it, expect } from "vitest"

import { mergeSsrExternal, mergeAlias } from "../../src/shared/vite.js"

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
