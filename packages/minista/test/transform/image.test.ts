import { describe, expect, it } from "vitest"
import path from "node:path"
import { fileURLToPath } from "node:url"

import {
  getImageSize,
  getImageAspect,
  getImageAspects,
  getImageLength,
  resolveOutFormat,
  resolveBreakpoints,
} from "../../src/transform/image"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

describe("getImageSize", () => {
  it("Default", async () => {
    const result = await getImageSize(
      path.join(__dirname, "../_data/image.png")
    )
    expect(result.width).toEqual(2208)
  })

  it("No file", async () => {
    const result = await getImageSize(
      path.join(__dirname, "../_data/imagex.png")
    )
    expect(result.width).toEqual(0)
  })
})

describe("getImageAspect", () => {
  it("Default", () => {
    const result = getImageAspect(100, 50)
    expect(result).toEqual(2)
  })

  it("String", () => {
    const result = getImageAspect("100", "50")
    expect(result).toEqual(2)
  })

  it("Reverse", () => {
    const result = getImageAspect(50, 100)
    expect(result).toEqual(0.5)
  })
})

describe("getImageAspects", () => {
  it("Default", () => {
    const result = getImageAspects(100, 50)
    expect(result).toEqual({ aspectWidth: 2, aspectHeight: 0.5 })
  })

  it("Aspect", () => {
    const result = getImageAspects(0, 0, "2:1")
    expect(result).toEqual({ aspectWidth: 2, aspectHeight: 0.5 })
  })
})

describe("getImageLength", () => {
  it("Default", () => {
    const result = getImageLength(100, 0.5)
    expect(result).toEqual(50)
  })

  it("String", () => {
    const result = getImageLength("100", 0.5)
    expect(result).toEqual(50)
  })

  it("Up", () => {
    const result = getImageLength(100, 1.235)
    expect(result).toEqual(124)
  })

  it("Cut", () => {
    const result = getImageLength(100, 1.234)
    expect(result).toEqual(123)
  })
})

describe("resolveOutFormat", () => {
  it("Inherit", () => {
    const result = resolveOutFormat("png", "inherit")
    expect(result).toEqual("png")
  })

  it("Change webp", () => {
    const result = resolveOutFormat("png", "webp")
    expect(result).toEqual("webp")
  })
})

describe("resolveBreakpoints", () => {
  it("Array sort", () => {
    const result = resolveBreakpoints([100, 200, 50], 2208)
    expect(result).toEqual([50, 100, 200])
  })

  it("Count 1", () => {
    const result = resolveBreakpoints({}, 2208)
    expect(result).toEqual([2208])
  })

  it("Count 2", () => {
    const result = resolveBreakpoints({ count: 2 }, 2208)
    expect(result).toEqual([320, 2208])
  })

  it("Count 3", () => {
    const result = resolveBreakpoints({ count: 3 }, 2208)
    expect(result).toEqual([320, 1264, 2208])
  })

  it("Count 4", () => {
    const result = resolveBreakpoints({ count: 4 }, 2208)
    expect(result).toEqual([320, 949, 1264, 2208])
  })

  it("Count with min max", () => {
    const result = resolveBreakpoints(
      { count: 8, minWidth: 200, maxWidth: 1500 },
      2208
    )
    expect(result).toEqual([200, 386, 417, 460, 525, 633, 850, 1500])
  })
})
