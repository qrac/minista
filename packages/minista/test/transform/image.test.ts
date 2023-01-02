import { describe, expect, it } from "vitest"

import path from "node:path"
import { fileURLToPath } from "node:url"
import { parse as parseHtml } from "node-html-parser"

import { resolveConfig } from "../../src/config"
import {
  resolveRemoteImage,
  resolveEntryImage,
  resolveViewImage,
  resolveOutFormat,
  resolveBreakpoints,
  resolveCreateImage,
  resolveServeImage,
  resolveBuildImage,
  transformEntryImages,
  transformRelativeImages,
} from "../../src/transform/image"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

describe("resolveRemoteImage", () => {
  it("Default", async () => {
    const config = await resolveConfig({})
    const { optimize } = config.main.assets.images
    const { resolvedRoot } = config.sub
    const entryImages = {}

    const url = "https://example.com/image.png"

    const result = await resolveRemoteImage({
      useBuild: false,
      url,
      config,
      optimize,
      entryImages,
    })

    //console.log(result)
    expect(result.replace(resolvedRoot, "")).toEqual(
      "/node_modules/.minista/images/remote/image.png"
    )
  })
})

describe("resolveEntryImage", () => {
  it("Default", () => {
    const entry = {
      fileName: path.join(__dirname, "../_data/image.png"),
      width: 0,
      height: 0,
      aspectWidth: 1,
      aspectHeight: 1,
    }

    const result = resolveEntryImage(entry)

    //console.log(result)
    expect(result.width).toEqual(2208)
  })
})

describe("resolveViewImage", () => {
  it("Default", async () => {
    const config = await resolveConfig({})
    const { optimize } = config.main.assets.images

    const entry = {
      fileName: path.join(__dirname, "../_data/image.png"),
      width: 2208,
      height: 1080,
      aspectWidth: 2.04,
      aspectHeight: 0.49,
    }
    const view = {
      width: "__minista_image_auto_size",
      height: "__minista_image_auto_size",
      sizes: "__minista_image_auto_size",
      aspectWidth: 1,
      aspectHeight: 1,
      changeWidth: false,
      changeHeight: false,
    }

    const result = resolveViewImage({ view, entry, resolvedOptimize: optimize })

    //console.log(result)
    expect(result.width).toEqual("2208")
  })
})

describe("resolveOutFormat", () => {
  it("Inherit", () => {
    const result = resolveOutFormat("png", "inherit")

    //console.log(result)
    expect(result).toEqual("png")
  })

  it("Change webp", () => {
    const result = resolveOutFormat("png", "webp")

    //console.log(result)
    expect(result).toEqual("webp")
  })
})

describe("resolveBreakpoints", () => {
  it("Array sort", () => {
    const result = resolveBreakpoints([100, 200, 50], 2208)

    //console.log(result)
    expect(result).toEqual([50, 100, 200])
  })

  it("Count 1", () => {
    const result = resolveBreakpoints({}, 2208)

    //console.log(result)
    expect(result).toEqual([2208])
  })

  it("Count 2", () => {
    const result = resolveBreakpoints({ count: 2 }, 2208)

    //console.log(result)
    expect(result).toEqual([320, 2208])
  })

  it("Count 3", () => {
    const result = resolveBreakpoints({ count: 3 }, 2208)

    //console.log(result)
    expect(result).toEqual([320, 1264, 2208])
  })

  it("Count 4", () => {
    const result = resolveBreakpoints({ count: 4 }, 2208)

    //console.log(result)
    expect(result).toEqual([320, 949, 1264, 2208])
  })

  it("Count with min max", () => {
    const result = resolveBreakpoints(
      { count: 8, minWidth: 200, maxWidth: 1500 },
      2208
    )

    //console.log(result)
    expect(result).toEqual([200, 386, 417, 460, 525, 633, 850, 1500])
  })
})

describe("resolveCreateImage", () => {
  it("Default", async () => {
    const config = await resolveConfig({})
    const { optimize } = config.main.assets.images

    const result = resolveCreateImage({
      inputPath: path.join(__dirname, "../_data/image.png"),
      width: 200,
      height: 200,
      outFormat: "png",
      resolvedOptimize: optimize,
    })

    //console.log(result)
    expect(result.resizeOptions.fit).toEqual("cover")
  })

  it("Overlay quality", async () => {
    const config = await resolveConfig({
      assets: { images: { optimize: { quality: 50 } } },
    })
    const { optimize } = config.main.assets.images

    const result = resolveCreateImage({
      inputPath: path.join(__dirname, "../_data/image.png"),
      width: 200,
      height: 200,
      outFormat: "png",
      resolvedOptimize: optimize,
    })

    //console.log(result)
    expect(result.formatOptions.jpg?.quality).toEqual(50)
  })
})

describe("resolveServeImage", () => {
  it("Default", async () => {
    const config = await resolveConfig({})
    const { optimize } = config.main.assets.images

    const entry = {
      fileName: path.join(__dirname, "../_data/image.png"),
      width: 2208,
      height: 1080,
      aspectWidth: 2.04,
      aspectHeight: 0.49,
    }
    const view = {
      width: "2208",
      height: "1080",
      sizes: "",
      aspectWidth: 2.04,
      aspectHeight: 0.49,
      changeWidth: false,
      changeHeight: false,
    }

    const result = await resolveServeImage({
      useBuild: false,
      entry,
      view,
      createImages: {},
      tempOutDir: path.join(__dirname, "../_data"),
      resolvedOptimize: optimize,
      config,
    })

    //console.log(result)
    expect(result).toEqual({
      src: "/packages/minista/test/_data/image.png",
      srcset: "/packages/minista/test/_data/image.png",
    })
  })
})

describe("resolveBuildImage", () => {
  it("Constrained", async () => {
    const config = await resolveConfig({
      assets: { images: { optimize: { breakpoints: [200, 300] } } },
    })
    const { optimize } = config.main.assets.images

    const entry = {
      fileName: path.join(__dirname, "../_data/image.png"),
      width: 2208,
      height: 1080,
      aspectWidth: 2.04,
      aspectHeight: 0.49,
    }
    const view = {
      width: "2208",
      height: "1080",
      sizes: "",
      aspectWidth: 2.04,
      aspectHeight: 0.49,
      changeWidth: false,
      changeHeight: false,
    }

    const result = resolveBuildImage({
      entry,
      view,
      createImages: {},
      resolvedOptimize: optimize,
      config,
    })

    //console.log(result)
    expect(result).toEqual({
      src: "/assets/images/image-300x147.png",
      srcset:
        "/assets/images/image-200x98.png 200w, /assets/images/image-300x147.png 300w",
      outFormat: "png",
    })
  })

  it("Fixed", async () => {
    const config = await resolveConfig({
      assets: { images: { optimize: { layout: "fixed" } } },
    })
    const { optimize } = config.main.assets.images

    const entry = {
      fileName: path.join(__dirname, "../_data/image.png"),
      width: 2208,
      height: 1080,
      aspectWidth: 2.04,
      aspectHeight: 0.49,
    }
    const view = {
      width: "300",
      height: "300",
      sizes: "",
      aspectWidth: 2.04,
      aspectHeight: 0.49,
      changeWidth: false,
      changeHeight: false,
    }

    const result = resolveBuildImage({
      entry,
      view,
      createImages: {},
      resolvedOptimize: optimize,
      config,
    })

    //console.log(result)
    expect(result).toEqual({
      src: "/assets/images/image-300x300.png",
      srcset:
        "/assets/images/image-300x300.png 1x, /assets/images/image-600x600.png 2x",
      outFormat: "png",
    })
  })
})

describe("transformEntryImages", () => {
  it("Default", async () => {
    const config = await resolveConfig({})

    const html = `<img
  srcset src
  width="__minista_image_auto_size"
  height="__minista_image_auto_size"
  sizes="__minista_image_auto_size"
  data-minista-transform-target="image"
  data-minista-image-src="/packages/minista/test/_data/image.png"
  data-minista-image-optimize="{}"
>`
    const parsedHtml = parseHtml(html)

    const result = await transformEntryImages({
      command: "build",
      parsedHtml,
      config,
      entryImages: {},
      createImages: {},
    })

    //console.log(result.toString())
    expect(result.toString()).toEqual(
      `<img srcset="/assets/images/image-320x157.png 320w, /assets/images/image-400x196.png 400w, /assets/images/image-640x314.png 640w, /assets/images/image-800x392.png 800w, /assets/images/image-1024x502.png 1024w, /assets/images/image-1280x627.png 1280w, /assets/images/image-1440x706.png 1440w, /assets/images/image-1920x941.png 1920w, /assets/images/image-2208x1080.png 2208w" src="/assets/images/image-2208x1080.png" width="2208" height="1080" sizes="(min-width: 2208px) 2208px, 100vw">`
    )
  })
})

describe("transformRelativeImages", () => {
  it("Default", async () => {
    const config = await resolveConfig({})

    const pathname = "/about/"
    const html = `<img src="/assets/images/image.png">`
    const parsedHtml = parseHtml(html)

    const result = transformRelativeImages({
      parsedHtml,
      pathname,
      config,
    })

    //console.log(result)
    expect(result.toString()).toEqual(`<img src="../assets/images/image.png">`)
  })
})
