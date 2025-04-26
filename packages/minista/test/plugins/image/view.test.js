import { describe, it, expect } from "vitest"

import { getImageView } from "../../../src/plugins/image/utils/view.js"

const AUTO = "__minista_image_auto_size"

const baseResolvedOptimize = {
  layout: "constrained",
  breakpoints: [100],
  resolutions: [],
  format: "jpg",
  formatOptions: {},
  fit: "cover",
  position: "center",
}

const baseImageEntry = {
  filePath: "dummy.jpg",
  width: 400,
  height: 200,
  ratioWidth: 2,
  ratioHeight: 0.5,
  imageCreateMap: {},
  imageCreatedMap: {},
}

describe("getImageView", () => {
  it("数値指定のサイズでは ratio が再計算され、changeAspect は false になる", () => {
    const resolvedOptimize = {
      ...baseResolvedOptimize,
      breakpoints: [100, 200, 300],
    }
    const imageEntry = { ...baseImageEntry }
    const elAttrs = { sizes: "50vw", width: "200", height: "100" }
    const result = getImageView(resolvedOptimize, imageEntry, elAttrs)
    expect(result).toEqual({
      sizes: "50vw",
      width: 200,
      height: 100,
      ratioWidth: 2,
      ratioHeight: 0.5,
      changeAspect: false,
    })
  })

  it("aspect が指定されているときは指定比率を優先し、changeAspect は true になる", () => {
    const resolvedOptimize = {
      ...baseResolvedOptimize,
      layout: "fixed",
      aspect: "1:1",
      breakpoints: [100, 200],
    }
    const imageEntry = { ...baseImageEntry }
    const elAttrs = { sizes: "100vw", width: "200", height: "100" }
    const result = getImageView(resolvedOptimize, imageEntry, elAttrs)
    expect(result.ratioWidth).toBe(1)
    expect(result.ratioHeight).toBe(1)
    expect(result.changeAspect).toBe(true)
  })

  it("AUTO サイズ指定 (width & height) では imageEntry のサイズを使う", () => {
    const resolvedOptimize = {
      ...baseResolvedOptimize,
      layout: "fixed",
      breakpoints: [100, 200],
    }
    const imageEntry = { ...baseImageEntry }
    const elAttrs = { sizes: "100vw", width: AUTO, height: AUTO }
    const result = getImageView(resolvedOptimize, imageEntry, elAttrs)
    expect(result.width).toBe(400)
    expect(result.height).toBe(200)
  })

  it("AUTO width のみ指定すると height から width を計算する", () => {
    const resolvedOptimize = {
      ...baseResolvedOptimize,
      layout: "fixed",
      breakpoints: [],
    }
    const imageEntry = {
      ...baseImageEntry,
      ratioWidth: 1.5,
      ratioHeight: 0.6667,
    }
    const elAttrs = { sizes: "100vw", width: AUTO, height: "100" }
    const result = getImageView(resolvedOptimize, imageEntry, elAttrs)
    expect(result.width).toBe(Math.round(100 * 1.5))
  })

  it("AUTO height のみ指定すると width から height を計算する", () => {
    const resolvedOptimize = {
      ...baseResolvedOptimize,
      layout: "fixed",
      breakpoints: [],
    }
    const imageEntry = {
      ...baseImageEntry,
      ratioWidth: 2,
      ratioHeight: 0.5,
    }
    const elAttrs = { sizes: "100vw", width: "200", height: AUTO }
    const result = getImageView(resolvedOptimize, imageEntry, elAttrs)
    expect(result.height).toBe(Math.round(200 * 0.5))
  })

  it("AUTO sizes & constrained レイアウトでは sizes を breakpoints の最大値で生成する", () => {
    const resolvedOptimize = {
      ...baseResolvedOptimize,
      layout: "constrained",
      breakpoints: [150, 250],
    }
    const imageEntry = { ...baseImageEntry }
    const elAttrs = { sizes: AUTO, width: "200", height: "100" }
    const result = getImageView(resolvedOptimize, imageEntry, elAttrs)
    expect(result.sizes).toBe("(min-width: 250px) 250px, 100vw")
  })

  it("AUTO sizes & fixed レイアウトでは sizes を width で生成する", () => {
    const resolvedOptimize = {
      ...baseResolvedOptimize,
      layout: "fixed",
      breakpoints: [150, 250],
    }
    const imageEntry = { ...baseImageEntry }
    const elAttrs = { sizes: AUTO, width: "200", height: "100" }
    const result = getImageView(resolvedOptimize, imageEntry, elAttrs)
    expect(result.sizes).toBe("(min-width: 200px) 200px, 100vw")
  })
})
