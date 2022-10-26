import { describe, expect, it } from "vitest"

import {
  compileLinkTag,
  compileScriptTag,
  compileEntryTags,
} from "../../src/compile/tags"
import { resolveConfig } from "../../src/config"

describe("compileLinkTag", () => {
  it("Serve", async () => {
    const config = await resolveConfig({})
    const result = compileLinkTag({
      mode: "serve",
      pathname: "/",
      entry: {
        name: "style",
        input: "src/assets/style.scss",
        insertPages: ["**/*"],
        position: "head",
        attributes: "",
      },
      config,
    })

    //console.log(result)
    expect(result).toEqual(
      `<link rel="stylesheet" href="/@minista-project-root/src/assets/style.scss">`
    )
  })

  it("Ssg", async () => {
    const config = await resolveConfig({})
    const result = compileLinkTag({
      mode: "ssg",
      pathname: "/",
      entry: {
        name: "style",
        input: "src/assets/style.scss",
        insertPages: ["**/*"],
        position: "head",
        attributes: "",
      },
      config,
    })

    //console.log(result)
    expect(result).toEqual(`<link rel="stylesheet" href="/assets/style.css">`)
  })
})

describe("compileScriptTag", () => {
  it("Serve", async () => {
    const config = await resolveConfig({})
    const result = compileScriptTag({
      mode: "serve",
      pathname: "/",
      entry: {
        name: "script",
        input: "src/assets/script.ts",
        insertPages: ["**/*"],
        position: "head",
        attributes: "defer",
      },
      config,
    })

    //console.log(result)
    expect(result).toEqual(
      `<script defer src="/@minista-project-root/src/assets/script.ts"></script>`
    )
  })

  it("Ssg", async () => {
    const config = await resolveConfig({})
    const result = compileScriptTag({
      mode: "ssg",
      pathname: "/",
      entry: {
        name: "script",
        input: "src/assets/script.ts",
        insertPages: ["**/*"],
        position: "head",
        attributes: "",
      },
      config,
    })

    //console.log(result)
    expect(result).toEqual(
      `<script type="module" src="/assets/script.js"></script>`
    )
  })

  it("Ssg attributes false", async () => {
    const config = await resolveConfig({})
    const result = compileScriptTag({
      mode: "ssg",
      pathname: "/",
      entry: {
        name: "script",
        input: "src/assets/script.ts",
        insertPages: ["**/*"],
        position: "head",
        attributes: false,
      },
      config,
    })

    //console.log(result)
    expect(result).toEqual(`<script src="/assets/script.js"></script>`)
  })
})

describe("compileEntryTags", () => {
  it("Serve blank", async () => {
    const config = await resolveConfig({})
    const result = compileEntryTags({
      mode: "serve",
      pathname: "/",
      config,
    })

    //console.log(result)
    expect(result).toEqual({
      headTags: ``,
      startTags: ``,
      endTags: `<script type="module" src="/@minista/dist/scripts/bundle.js"></script>
<script type="module" src="/@minista/dist/scripts/partial.js"></script>`,
    })
  })

  it("Serve entry", async () => {
    const config = await resolveConfig({
      assets: { entry: "src/assets/style.scss" },
    })
    const result = compileEntryTags({
      mode: "serve",
      pathname: "/",
      config,
    })

    //console.log(result)
    expect(result).toEqual({
      headTags: `<link rel="stylesheet" href="/@minista-project-root/src/assets/style.scss">`,
      startTags: ``,
      endTags: `<script type="module" src="/@minista/dist/scripts/bundle.js"></script>
<script type="module" src="/@minista/dist/scripts/partial.js"></script>`,
    })
  })

  it("Ssg blank", async () => {
    const config = await resolveConfig({})
    const result = compileEntryTags({
      mode: "ssg",
      pathname: "/",
      config,
    })

    //console.log(result)
    expect(result).toEqual({
      headTags: `<link rel="stylesheet" data-minista-build-bundle-href="/assets/bundle.css">
<script type="module" data-minista-build-partial-src="/assets/partial.js"></script>`,
      startTags: ``,
      endTags: ``,
    })
  })

  it("Ssg entry", async () => {
    const config = await resolveConfig({
      assets: { entry: "src/assets/style.scss" },
    })
    const result = compileEntryTags({
      mode: "ssg",
      pathname: "/",
      config,
    })

    //console.log(result)
    expect(result).toEqual({
      headTags: `<link rel="stylesheet" href="/assets/style.css">
<link rel="stylesheet" data-minista-build-bundle-href="/assets/bundle.css">
<script type="module" data-minista-build-partial-src="/assets/partial.js"></script>`,
      startTags: ``,
      endTags: ``,
    })
  })
})
