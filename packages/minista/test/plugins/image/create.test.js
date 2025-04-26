import { describe, it, expect } from "vitest"

import {
  getImageCreateMap,
  getImageCreatedAttrs,
} from "../../../src/plugins/image/utils/create.js"

const imageEntry = {
  fileName: "photo.jpeg",
  width: 400,
  height: 200,
  ratioWidth: 2,
  ratioHeight: 0.5,
  imageCreateMap: {},
  imageCreatedMap: {},
}

const imageView = {
  sizes: "",
  width: 120,
  height: 80,
  ratioWidth: 1.5,
  ratioHeight: 0.6667,
  changeAspect: false,
}

describe("getImageCreateMap", () => {
  it("constrained layout, useSizeName=false, resizeOnly=false では各 breakpoint 分のエントリを名前なしで作成する", () => {
    const resolvedOptimize = {
      layout: "constrained",
      breakpoints: [100, 200],
      resolutions: [],
      format: "jpg",
      formatOptions: {},
      background: null,
      fit: "cover",
      position: "center",
    }
    const result = getImageCreateMap(resolvedOptimize, imageEntry, imageView, {
      useSizeName: false,
      resizeOnly: false,
    })
    const values = Object.values(result)
    expect(values).toHaveLength(2)
    expect(values).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          width: 100,
          height: 67,
          output: "photo.jpg",
        }),
        expect.objectContaining({
          width: 200,
          height: 133,
          output: "photo.jpg",
        }),
      ])
    )
  })

  it("constrained layout, useSizeName=true, resizeOnly=false ではサイズ付き名前で各 breakpoint 分のエントリを作成する", () => {
    const resolvedOptimize = {
      layout: "constrained",
      breakpoints: [150, 300],
      resolutions: [],
      format: "png",
      formatOptions: {},
      background: undefined,
      fit: "contain",
      position: "center",
    }
    const result = getImageCreateMap(resolvedOptimize, imageEntry, imageView, {
      useSizeName: true,
      resizeOnly: false,
    })
    const values = Object.values(result)
    expect(values).toHaveLength(2)
    expect(values).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          output: "photo-150x100.png",
          width: 150,
          height: 100,
        }),
        expect.objectContaining({
          output: "photo-300x200.png",
          width: 300,
          height: 200,
        }),
      ])
    )
  })

  it("constrained layout, useSizeName=true, resizeOnly=true では最大 breakpoint だけ作成する", () => {
    const resolvedOptimize = {
      layout: "constrained",
      breakpoints: [120, 240, 360],
      resolutions: [],
      format: "webp",
      formatOptions: {},
      background: null,
      fit: "cover",
      position: "center",
    }
    const result = getImageCreateMap(resolvedOptimize, imageEntry, imageView, {
      useSizeName: true,
      resizeOnly: true,
    })
    const values = Object.values(result)
    expect(values).toHaveLength(1)
    expect(values[0]).toMatchObject({
      output: "photo-360x240.webp",
      width: 360,
      height: 240,
    })
  })

  it("fixed layout, useSizeName=true, resizeOnly=false では各 resolution 分のエントリを作成する", () => {
    const resolvedOptimize = {
      layout: "fixed",
      breakpoints: [],
      resolutions: [1, 2],
      format: "avif",
      formatOptions: {},
      background: undefined,
      fit: "contain",
      position: "center",
    }
    const result = getImageCreateMap(resolvedOptimize, imageEntry, imageView, {
      useSizeName: true,
      resizeOnly: false,
    })
    const values = Object.values(result)
    expect(values).toHaveLength(2)
    expect(values).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          output: "photo-120x80.avif",
          width: 120,
          height: 80,
        }),
        expect.objectContaining({
          output: "photo-240x160.avif",
          width: 240,
          height: 160,
        }),
      ])
    )
  })

  it("fixed layout, useSizeName=false, resizeOnly=true では最大 resolution だけ作成し名前なしになる", () => {
    const resolvedOptimize = {
      layout: "fixed",
      breakpoints: [],
      resolutions: [1, 3],
      format: "jpg",
      formatOptions: {},
      background: null,
      fit: "cover",
      position: "center",
    }
    const result = getImageCreateMap(resolvedOptimize, imageEntry, imageView, {
      useSizeName: false,
      resizeOnly: true,
    })
    const values = Object.values(result)
    expect(values).toHaveLength(1)
    expect(values[0]).toMatchObject({
      output: "photo.jpg",
      width: 360,
      height: 240,
    })
  })

  it("不明な layout の場合は空オブジェクトを返す", () => {
    const resolvedOptimize = {
      layout: "unknown",
      breakpoints: [100],
      resolutions: [1],
      format: "png",
      formatOptions: {},
      background: undefined,
      fit: "cover",
      position: "center",
    }
    const result = getImageCreateMap(resolvedOptimize, imageEntry, imageView, {
      useSizeName: true,
      resizeOnly: false,
    })
    expect(result).toEqual({})
  })
})

describe("getImageCreatedAttrs", () => {
  it("constrained layout, useSizeName=false, resizeOnly=false では srcset に w 単位で登録し、src は最後のファイル", () => {
    const resolvedOptimize = {
      layout: "constrained",
      breakpoints: [100, 200],
      resolutions: [],
      format: "jpg",
      formatOptions: {},
      background: null,
      fit: "cover",
      position: "center",
    }
    const result = getImageCreatedAttrs(
      resolvedOptimize,
      imageEntry,
      imageView,
      { useSizeName: false, resizeOnly: false }
    )
    expect(result.srcset).toEqual({
      "100w": "photo.jpg",
      "200w": "photo.jpg",
    })
    expect(result.src).toBe("photo.jpg")
  })

  it("constrained layout, useSizeName=true, resizeOnly=false ではサイズ付き名前付きで srcset を登録", () => {
    const resolvedOptimize = {
      layout: "constrained",
      breakpoints: [150, 300],
      resolutions: [],
      format: "png",
      formatOptions: {},
      background: undefined,
      fit: "contain",
      position: "center",
    }
    const result = getImageCreatedAttrs(
      resolvedOptimize,
      imageEntry,
      imageView,
      { useSizeName: true, resizeOnly: false }
    )
    expect(result.srcset).toEqual({
      "150w": "photo-150x100.png",
      "300w": "photo-300x200.png",
    })
    expect(result.src).toBe("photo-300x200.png")
  })

  it("constrained layout, useSizeName=true, resizeOnly=true では srcset は空、src は最大 breakpoint", () => {
    const resolvedOptimize = {
      layout: "constrained",
      breakpoints: [120, 240, 360],
      resolutions: [],
      format: "webp",
      formatOptions: {},
      background: null,
      fit: "cover",
      position: "center",
    }
    const result = getImageCreatedAttrs(
      resolvedOptimize,
      imageEntry,
      imageView,
      { useSizeName: true, resizeOnly: true }
    )
    expect(result.srcset).toEqual({})
    expect(result.src).toBe("photo-360x240.webp")
  })

  it("fixed layout, useSizeName=true, resizeOnly=false では srcset に x 単位で登録", () => {
    const resolvedOptimize = {
      layout: "fixed",
      breakpoints: [],
      resolutions: [1, 2],
      format: "avif",
      formatOptions: {},
      background: undefined,
      fit: "contain",
      position: "center",
    }
    const result = getImageCreatedAttrs(
      resolvedOptimize,
      imageEntry,
      imageView,
      { useSizeName: true, resizeOnly: false }
    )
    expect(result.srcset).toEqual({
      "1x": "photo-120x80.avif",
      "2x": "photo-240x160.avif",
    })
    expect(result.src).toBe("photo-240x160.avif")
  })

  it("fixed layout, useSizeName=false, resizeOnly=true では srcset は空、src は最大 resolution", () => {
    const resolvedOptimize = {
      layout: "fixed",
      breakpoints: [],
      resolutions: [1, 3],
      format: "jpg",
      formatOptions: {},
      background: null,
      fit: "cover",
      position: "center",
    }
    const result = getImageCreatedAttrs(
      resolvedOptimize,
      imageEntry,
      imageView,
      { useSizeName: false, resizeOnly: true }
    )
    expect(result.srcset).toEqual({})
    expect(result.src).toBe("photo.jpg")
  })

  it("不明な layout の場合は空の srcset と空の src を返す", () => {
    const resolvedOptimize = {
      layout: "unknown",
      breakpoints: [100],
      resolutions: [1],
      format: "png",
      formatOptions: {},
      background: undefined,
      fit: "cover",
      position: "center",
    }
    const result = getImageCreatedAttrs(
      resolvedOptimize,
      imageEntry,
      imageView,
      { useSizeName: true, resizeOnly: false }
    )
    expect(result).toEqual({ srcset: {}, src: "" })
  })
})
