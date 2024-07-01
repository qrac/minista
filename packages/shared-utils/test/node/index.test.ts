import { describe, expect, it } from "vitest"

import {
  getPluginName,
  getTempName,
  getPagePath,
  getHtmlPath,
  getBasedAssetPath,
} from "../../src/node/index.js"

describe("getPluginName", () => {
  it("basic", () => {
    const result = getPluginName(["ssg", "build"])
    expect(result).toEqual("vite-plugin:minista-ssg-build")
  })
})

describe("getTempName", () => {
  it("basic", () => {
    const result = getTempName(["ssg", "build"])
    expect(result).toEqual("__minista_ssg_build")
  })
})

describe("getPagePath", () => {
  it("root", () => {
    const result = getPagePath("/index.tsx")
    expect(result).toEqual("/")
  })

  it("root, has srcBase", () => {
    const result = getPagePath("/src/pages/index.tsx", ["/src/pages"])
    expect(result).toEqual("/")
  })

  it("page, named file", () => {
    const result = getPagePath("/about.tsx")
    expect(result).toEqual("/about")
  })

  it("page, index file", () => {
    const result = getPagePath("/about/index.tsx")
    expect(result).toEqual("/about/")
  })

  it("template", () => {
    const result = getPagePath("/posts/[slug].tsx")
    expect(result).toEqual("/posts/:slug")
  })

  it("duplicate root", () => {
    const result = getPagePath("///index.tsx")
    expect(result).toEqual("/")
  })
})

describe("getHtmlPath", () => {
  it("root", () => {
    const result = getHtmlPath("/")
    expect(result).toEqual("index.html")
  })

  it("page", () => {
    const result = getHtmlPath("/about")
    expect(result).toEqual("about.html")
  })

  it("page, index", () => {
    const result = getHtmlPath("/about/")
    expect(result).toEqual("about/index.html")
  })

  it("nest, page", () => {
    const result = getHtmlPath("/nest/about")
    expect(result).toEqual("nest/about.html")
  })

  it("nest, page, index", () => {
    const result = getHtmlPath("/nest/about/")
    expect(result).toEqual("nest/about/index.html")
  })
})

describe("getBasedAssetPath", () => {
  it("root", () => {
    const result = getBasedAssetPath("/", "index.html", "assets/style.css")
    expect(result).toEqual("/assets/style.css")
  })

  it("nest root", () => {
    const result = getBasedAssetPath("/nest/", "index.html", "assets/style.css")
    expect(result).toEqual("/nest/assets/style.css")
  })

  it("nest root, nest page", () => {
    const result = getBasedAssetPath(
      "/nest/",
      "/nest/index.html",
      "assets/style.css"
    )
    expect(result).toEqual("/nest/assets/style.css")
  })

  it("absolute", () => {
    const result = getBasedAssetPath("./", "index.html", "assets/style.css")
    expect(result).toEqual("assets/style.css")
  })

  it("absolute, nest page", () => {
    const result = getBasedAssetPath(
      "./",
      "about/index.html",
      "assets/style.css"
    )
    expect(result).toEqual("../assets/style.css")
  })
})
