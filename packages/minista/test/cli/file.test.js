import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { findConfigFile } from "../../src/cli/utils/file.js"

describe("findConfigFile", () => {
  let cwd
  let testRoot

  beforeEach(() => {
    cwd = process.cwd()
    testRoot = fs.mkdtempSync(path.join(os.tmpdir(), "minista-config-"))
    process.chdir(testRoot)
  })

  afterEach(() => {
    process.chdir(cwd)
    fs.rmSync(testRoot, { recursive: true, force: true })
  })

  it("設定ファイルがない場合は空文字を返す", () => {
    expect(findConfigFile()).toBe("")
  })

  it("vite.configを検出する", () => {
    fs.writeFileSync("vite.config.ts", "")

    expect(findConfigFile()).toBe("vite.config.ts")
  })

  it("minista.configを検出する", () => {
    fs.writeFileSync("minista.config.mjs", "")

    expect(findConfigFile()).toBe("minista.config.mjs")
  })

  it("複数検出時はvite.configを先に表示する", () => {
    fs.writeFileSync("vite.config.js", "")
    fs.writeFileSync("vite.config.ts", "")

    expect(() => findConfigFile()).toThrow(
      "Multiple config files were found."
    )
  })

  it("複数の設定ファイルがある場合はファイル名を含むエラーを投げる", () => {
    fs.writeFileSync("vite.config.js", "")
    fs.writeFileSync("minista.config.js", "")

    expect(() => findConfigFile()).toThrow(
      new Error(
        "Multiple config files were found.\n\n" +
          "  vite.config.js\n" +
          "  minista.config.js\n\n" +
          "Please remove one of them. `vite.config.js` is recommended."
      )
    )
  })

  it("root引数で指定されたディレクトリから設定ファイルを検出する", () => {
    fs.mkdirSync("site")
    fs.writeFileSync(path.join("site", "vite.config.ts"), "")

    expect(findConfigFile("site")).toBe(path.resolve("site", "vite.config.ts"))
  })
})
