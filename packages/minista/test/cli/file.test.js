import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import {
  ConfigFileConflictError,
  findConfigFile,
} from "../../src/cli/utils/file.js"

describe("findConfigFile", () => {
  /** @type {string} */
  let cwd
  /** @type {string} */
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
    fs.writeFileSync("minista.config.ts", "")
    fs.writeFileSync("vite.config.mjs", "")

    expect(() => findConfigFile()).toThrowError(ConfigFileConflictError)

    try {
      findConfigFile()
    } catch (error) {
      expect(error).toMatchObject({
        diagnostic: {
          code: "MINISTA_CLI_CONFIG_CONFLICT",
          message: expect.stringMatching(
            /vite\.config\.mjs[\s\S]+minista\.config\.ts/,
          ),
        },
      })
    }
  })

  it("root引数で指定されたディレクトリから設定ファイルを検出する", () => {
    fs.mkdirSync("site")
    fs.writeFileSync(path.join("site", "vite.config.ts"), "")

    expect(findConfigFile("site")).toBe(path.resolve("site", "vite.config.ts"))
  })
})
