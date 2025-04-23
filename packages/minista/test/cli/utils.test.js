import { describe, it, expect } from "vitest"

import {
  findRootArg,
  resolveConfigArg,
  resolveOneBuildArg,
  resolveSsrArg,
} from "../../src/cli/utils.js"

describe("findRootArg", () => {
  it("returns first arg if it's not a flag or known command", () => {
    expect(findRootArg(["my-site"])).toBe("my-site")
  })

  it("returns second arg if first is a command and second is not a flag", () => {
    expect(findRootArg(["build", "my-site"])).toBe("my-site")
  })

  it("returns empty string if only command and flags are present", () => {
    expect(findRootArg(["build", "--some-flag"])).toBe("")
    expect(findRootArg([])).toBe("")
  })
})

describe("resolveConfigArg", () => {
  it("returns args unchanged if --config is already present", () => {
    const args = ["build", "--config", "minista.config.ts"]
    expect(resolveConfigArg(args, "minista.config.ts")).toEqual(args)
  })

  it("appends --config if configFile is given and not already in args", () => {
    const args = ["build"]
    expect(resolveConfigArg(args, "minista.config.ts")).toEqual([
      "build",
      "--config",
      "minista.config.ts",
    ])
  })

  it("returns args unchanged if configFile is not given", () => {
    const args = ["build"]
    expect(resolveConfigArg(args)).toEqual(args)
  })
})

describe("resolveOneBuildArg", () => {
  it("removes --oneBuild from args if isOneBuild is true", () => {
    const args = ["build", "--oneBuild", "--config", "minista.config.ts"]
    expect(resolveOneBuildArg(args, true)).toEqual([
      "build",
      "--config",
      "minista.config.ts",
    ])
  })

  it("returns args unchanged if isOneBuild is false", () => {
    const args = ["build", "--oneBuild"]
    expect(resolveOneBuildArg(args, false)).toEqual(["build", "--oneBuild"])
  })

  it("returns args unchanged if --oneBuild is not present", () => {
    const args = ["build"]
    expect(resolveOneBuildArg(args, true)).toEqual(["build"])
  })
})

describe("resolveSsrArg", () => {
  it("removes --ssr and its value if present and isOneBuild is false", () => {
    const args = ["build", "--ssr", "entry.js", "--config", "minista.config.ts"]
    expect(resolveSsrArg(args, false)).toEqual([
      "build",
      "--config",
      "minista.config.ts",
    ])
  })

  it("removes only --ssr if no value follows", () => {
    const args = ["build", "--ssr", "--config", "minista.config.ts"]
    expect(resolveSsrArg(args, false)).toEqual([
      "build",
      "--config",
      "minista.config.ts",
    ])
  })

  it("does not modify args if isOneBuild is true", () => {
    const args = ["build", "--ssr", "entry.js"]
    expect(resolveSsrArg(args, true)).toEqual(args)
  })

  it("does not modify args if not a build command", () => {
    const args = ["dev", "--ssr", "entry.js"]
    expect(resolveSsrArg(args, false)).toEqual(args)
  })
})
