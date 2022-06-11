import type { OnResolveArgs } from "esbuild"

import { describe, expect, it } from "vitest"

import { getEsbuildResolvePath } from "../src/esbuild"

describe("getEsbuildResolvePath", () => {
  it("Test: getEsbuildResolvePath", () => {
    const args: OnResolveArgs = {
      path: "~/components/app-header?ph",
      importer: "/Users/user/github/demo/src/components/app-layout.tsx",
      namespace: "file",
      resolveDir: "/Users/user/github/demo/src/components",
      kind: "import-statement",
      pluginData: undefined,
    }
    const alias = [{ find: "~", replacement: "/Users/user/github/demo/src" }]
    const result = getEsbuildResolvePath(args, alias)

    //console.log(result)
    expect(result).toEqual(
      "/Users/user/github/demo/src/components/app-header?ph"
    )
  })

  it("Test: getEsbuildResolvePath no alias", () => {
    const args: OnResolveArgs = {
      path: "./app-header?ph",
      importer: "/Users/user/github/demo/src/components/app-layout.tsx",
      namespace: "file",
      resolveDir: "/Users/user/github/demo/src/components",
      kind: "import-statement",
      pluginData: undefined,
    }
    const alias = []
    const result = getEsbuildResolvePath(args, alias)

    //console.log(result)
    expect(result).toEqual(
      "/Users/user/github/demo/src/components/app-header?ph"
    )
  })
})
