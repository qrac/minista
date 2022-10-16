import { describe, expect, it } from "vitest"

import {
  compileBundleTag,
  compileLinkTag,
  compileScriptTag,
  compileEntryTags,
} from "../../src/compile/tags"
import { resolveConfig } from "../../src/config"

describe("compileBundleTag", () => {
  it("Default", async () => {
    const config = await resolveConfig({})
    const result = compileBundleTag({
      pathname: "/",
      config,
    })

    //console.log(result)
    expect(result).toEqual(
      `<link rel="stylesheet" data-minista-build-bundle-href="/assets/bundle.css">`
    )
  })

  it("Relative", async () => {
    const config = await resolveConfig({ base: "./" })
    const result = compileBundleTag({
      pathname: "/",
      config,
    })

    //console.log(result)
    expect(result).toEqual(
      `<link rel="stylesheet" data-minista-build-bundle-href="assets/bundle.css">`
    )
  })

  it("Relative nest", async () => {
    const config = await resolveConfig({ base: "./" })
    const result = compileBundleTag({
      pathname: "/foo/bar/",
      config,
    })

    //console.log(result)
    expect(result).toEqual(
      `<link rel="stylesheet" data-minista-build-bundle-href="../../assets/bundle.css">`
    )
  })
})

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
        loadType: "defer",
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
        loadType: "defer",
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
        loadType: "defer",
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
        loadType: "defer",
      },
      config,
    })

    //console.log(result)
    expect(result).toEqual(`<script defer src="/assets/script.js"></script>`)
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
      endTags: `<script type="module">import "/@minista/dist/scripts/bundle.js"</script>`,
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
      endTags: `<script type="module">import "/@minista/dist/scripts/bundle.js"</script>`,
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
      headTags: `<link rel="stylesheet" data-minista-build-bundle-href="/assets/bundle.css">`,
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
<link rel="stylesheet" data-minista-build-bundle-href="/assets/bundle.css">`,
      startTags: ``,
      endTags: ``,
    })
  })
})
