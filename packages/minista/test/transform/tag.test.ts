import { describe, expect, it } from "vitest"

import { resolveConfig } from "../../src/config"
import { flags } from "../../src/config/system"
import { getLinkTag, getScriptTag } from "../../src/transform/tag"

describe("getLinkTag", () => {
  it("Serve", async () => {
    const config = await resolveConfig({})
    const result = getLinkTag({
      command: "serve",
      name: "style",
      input: "src/assets/style.scss",
      config,
    })
    expect(result).toEqual(
      `<link rel="stylesheet" href="/@minista-project-root/src/assets/style.scss">`
    )
  })

  it("Build", async () => {
    const config = await resolveConfig({})
    const result = getLinkTag({
      command: "build",
      name: "style",
      input: "src/assets/style.scss",
      config,
    })
    expect(result).toEqual(
      `<link rel="stylesheet" href="/assets/style.css" ${flags.entried}>`
    )
  })
})

describe("getScriptTag", () => {
  it("Serve", async () => {
    const config = await resolveConfig({})
    const result = getScriptTag({
      command: "serve",
      name: "script",
      input: "src/assets/script.ts",
      attributes: "defer",
      config,
    })
    expect(result).toEqual(
      `<script defer src="/@minista-project-root/src/assets/script.ts"></script>`
    )
  })

  it("Build", async () => {
    const config = await resolveConfig({})
    const result = getScriptTag({
      command: "build",
      name: "script",
      input: "src/assets/script.ts",
      config,
    })
    expect(result).toEqual(
      `<script type="module" src="/assets/script.js" ${flags.entried}></script>`
    )
  })

  it("Build with attributes false", async () => {
    const config = await resolveConfig({})
    const result = getScriptTag({
      command: "build",
      name: "script",
      input: "src/assets/script.ts",
      attributes: false,
      config,
    })
    expect(result).toEqual(
      `<script src="/assets/script.js" ${flags.entried}></script>`
    )
  })
})
