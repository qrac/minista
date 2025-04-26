import { describe, it, expect } from "vitest"

import {
  findRootArg,
  resolveConfigArg,
  resolveOneBuildArg,
  resolveSsrArg,
} from "../../src/cli/utils/arg.js"

describe("findRootArg", () => {
  it("最初の引数がフラグでも既知のコマンドでもない場合はその引数を返す", () => {
    expect(findRootArg(["my-site"])).toBe("my-site")
  })

  it("最初の引数がコマンドで、2番目の引数がフラグでない場合は2番目の引数を返す", () => {
    expect(findRootArg(["build", "my-site"])).toBe("my-site")
  })

  it("コマンドとフラグのみの場合は空文字を返す", () => {
    expect(findRootArg(["build", "--some-flag"])).toBe("")
    expect(findRootArg([])).toBe("")
  })
})

describe("resolveConfigArg", () => {
  it("--configがすでに含まれている場合は引数を変更せず返す", () => {
    const args = ["build", "--config", "minista.config.ts"]
    expect(resolveConfigArg(args, "minista.config.ts")).toEqual(args)
  })

  it("configFileが指定され、引数に含まれていない場合は--configを追加する", () => {
    const args = ["build"]
    expect(resolveConfigArg(args, "minista.config.ts")).toEqual([
      "build",
      "--config",
      "minista.config.ts",
    ])
  })

  it("configFileが指定されていない場合は引数を変更せず返す", () => {
    const args = ["build"]
    expect(resolveConfigArg(args)).toEqual(args)
  })
})

describe("resolveOneBuildArg", () => {
  it("isOneBuildがtrueの場合は引数から--oneBuildを削除する", () => {
    const args = ["build", "--oneBuild", "--config", "minista.config.ts"]
    expect(resolveOneBuildArg(args, true)).toEqual([
      "build",
      "--config",
      "minista.config.ts",
    ])
  })

  it("isOneBuildがfalseの場合は引数を変更せず返す", () => {
    const args = ["build", "--oneBuild"]
    expect(resolveOneBuildArg(args, false)).toEqual(["build", "--oneBuild"])
  })

  it("--oneBuildが含まれていない場合は引数を変更せず返す", () => {
    const args = ["build"]
    expect(resolveOneBuildArg(args, true)).toEqual(["build"])
  })
})

describe("resolveSsrArg", () => {
  it("isOneBuildがfalseで、--ssrとその値がある場合はそれらを削除する", () => {
    const args = ["build", "--ssr", "entry.js", "--config", "minista.config.ts"]
    expect(resolveSsrArg(args, false)).toEqual([
      "build",
      "--config",
      "minista.config.ts",
    ])
  })

  it("値が続かない場合は--ssrのみを削除する", () => {
    const args = ["build", "--ssr", "--config", "minista.config.ts"]
    expect(resolveSsrArg(args, false)).toEqual([
      "build",
      "--config",
      "minista.config.ts",
    ])
  })

  it("isOneBuildがtrueの場合は引数を変更しない", () => {
    const args = ["build", "--ssr", "entry.js"]
    expect(resolveSsrArg(args, true)).toEqual(args)
  })

  it("ビルドコマンドでない場合は引数を変更しない", () => {
    const args = ["dev", "--ssr", "entry.js"]
    expect(resolveSsrArg(args, false)).toEqual(args)
  })
})
