import { describe, expect, it } from "vitest"

import { getUserConfig, resolveUserConfig, resolveUserEntry } from "../src/user"

describe("resolveUserConfig", () => {
  it("Test: resolveUserConfig", () => {
    const result = resolveUserConfig({ assets: { entry: "entry.js" } })

    //console.log(result)
    expect(result).toEqual({
      base: "/",
      assets: { entry: { entry: "entry.js" } },
      vite: {
        base: "/",
        build: {
          rollupOptions: {
            input: {
              entry: "entry.js",
            },
          },
        },
        publicDir: "public",
      },
    })
  })
})

describe("resolveUserEntry", () => {
  it("Test: resolveUserEntry", () => {
    const result = resolveUserEntry("entry.js")

    //console.log(result)
    expect(result).toEqual({ entry: "entry.js" })
  })
})
