import { describe, expect, it } from "vitest"

import {
  findArgsRoot,
  checkArgsOneBuild,
  resolveArgsConfig,
  resolveArgsOneBuild,
  resolveArgsSsr,
} from "../../src/node/utils.js"

describe("findArgsRoot", () => {
  it("no length", () => {
    const args = []
    const result = findArgsRoot(args)
    expect(result).toEqual("")
  })

  it("has command, no root", () => {
    const args = ["dev"]
    const result = findArgsRoot(args)
    expect(result).toEqual("")
  })

  it("no command, has root", () => {
    const args = ["./test"]
    const result = findArgsRoot(args)
    expect(result).toEqual("./test")
  })

  it("has command, has root", () => {
    const args = ["dev", "./test"]
    const result = findArgsRoot(args)
    expect(result).toEqual("./test")
  })

  it("no command, no root, with arg", () => {
    const args = ["--base", "test"]
    const result = findArgsRoot(args)
    expect(result).toEqual("")
  })
})

describe("checkArgsOneBuild", () => {
  it("no length", () => {
    const args = []
    const result = checkArgsOneBuild(args)
    expect(result).toEqual(false)
  })

  it("no oneBuild", () => {
    const args = ["build"]
    const result = checkArgsOneBuild(args)
    expect(result).toEqual(false)
  })

  it("has oneBuild", () => {
    const args = ["build", "--oneBuild"]
    const result = checkArgsOneBuild(args)
    expect(result).toEqual(true)
  })
})

describe("resolveArgsConfig", () => {
  it("no length", () => {
    const args = []
    const configFile = ""
    const result = resolveArgsConfig(args, configFile)
    expect(result).toEqual([])
  })

  it("has long config arg, no config file", () => {
    const args = ["--config", "test.ts"]
    const configFile = ""
    const result = resolveArgsConfig(args, configFile)
    expect(result).toEqual(["--config", "test.ts"])
  })

  it("has long config arg, has config file", () => {
    const args = ["--config", "test.ts"]
    const configFile = "config.ts"
    const result = resolveArgsConfig(args, configFile)
    expect(result).toEqual(["--config", "test.ts"])
  })

  it("has short config arg, no config file", () => {
    const args = ["-c", "test.ts"]
    const configFile = ""
    const result = resolveArgsConfig(args, configFile)
    expect(result).toEqual(["-c", "test.ts"])
  })

  it("has short config arg, has config file", () => {
    const args = ["-c", "test.ts"]
    const configFile = "config.ts"
    const result = resolveArgsConfig(args, configFile)
    expect(result).toEqual(["-c", "test.ts"])
  })

  it("no config arg, has config file", () => {
    const args = []
    const configFile = "config.ts"
    const result = resolveArgsConfig(args, configFile)
    expect(result).toEqual(["--config", "config.ts"])
  })

  it("has arg, has config file", () => {
    const args = ["build"]
    const configFile = "config.ts"
    const result = resolveArgsConfig(args, configFile)
    expect(result).toEqual(["build", "--config", "config.ts"])
  })
})

describe("resolveArgsOneBuild", () => {
  it("no length", () => {
    const args = []
    const result = resolveArgsOneBuild(args)
    expect(result).toEqual([])
  })

  it("no oneBuild", () => {
    const args = ["build"]
    const result = resolveArgsOneBuild(args)
    expect(result).toEqual(["build"])
  })

  it("has oneBuild", () => {
    const args = ["build", "--oneBuild"]
    const result = resolveArgsOneBuild(args, true)
    expect(result).toEqual(["build"])
  })
})

describe("resolveArgsSsr", () => {
  it("no length", () => {
    const args = []
    const result = resolveArgsSsr(args)
    expect(result).toEqual([])
  })

  it("no build, no ssr", () => {
    const args = ["dev", "--base", "test"]
    const result = resolveArgsSsr(args)
    expect(result).toEqual(["dev", "--base", "test"])
  })

  it("no build, has ssr", () => {
    const args = ["dev", "--ssr", "test"]
    const result = resolveArgsSsr(args)
    expect(result).toEqual(["dev", "--ssr", "test"])
  })

  it("has build, no ssr", () => {
    const args = ["build", "--base", "test"]
    const result = resolveArgsSsr(args)
    expect(result).toEqual(["build", "--base", "test"])
  })

  it("has build, has ssr", () => {
    const args = ["build", "--ssr"]
    const result = resolveArgsSsr(args)
    expect(result).toEqual(["build"])
  })

  it("has build, has ssr, with arg", () => {
    const args = ["build", "--ssr", "--minify"]
    const result = resolveArgsSsr(args)
    expect(result).toEqual(["build", "--minify"])
  })

  it("has build, has ssr, with file", () => {
    const args = ["build", "--ssr", "test"]
    const result = resolveArgsSsr(args)
    expect(result).toEqual(["build"])
  })

  it("has build, has ssr, with file, with arg", () => {
    const args = ["build", "--ssr", "test", "--minify"]
    const result = resolveArgsSsr(args)
    expect(result).toEqual(["build", "--minify"])
  })

  it("has build, has ssr, has oneBuild", () => {
    const args = ["build", "--ssr"]
    const result = resolveArgsSsr(args, true)
    expect(result).toEqual(["build", "--ssr"])
  })
})
