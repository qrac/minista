import { describe, expect, it } from "vitest"

import {
  getPluginName,
  getTempName,
  getPagePath,
  getHtmlPath,
  getBasedAssetPath,
  getAttrPaths,
  convertPathToEntryId,
  convertEntryIdToPath,
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

describe("getAttrPaths", () => {
  const html = `<head>
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <link rel="icon" href="/favicon.ico" />
  <link rel="stylesheet" href="/src/style.css" />
  <link rel="stylesheet" href="/src/style2.css?20240101" />
  <link rel="stylesheet" href="src/style3.css" />
  <script src="/src/script.js"></script>
  <script src="/src/script2.js"></script>
  <script src="/src/script2.js"></script>
</head>
<body>
  <img src="/image2.svg" />
  <img src="/image.png" />
  <img src="/image2.svg" />
  <img src="https://picsum.photos/id/1/800/600" />
  <picture>
    <source
      srcset="
        /image-320x157.webp    320w,
        /image-400x196.webp    400w,
        /image-640x314.webp    640w,
      "
      type="image/webp"
    />
    <img
      srcset="
        /image-320x157.png    320w,
        /image-400x196.png    400w,
        /image-640x314.png    640w,
      "
    />
  </picture>
  <svg role="img">
    <use xlink:href="/sprite.svg?20230927#star"></use>
  </svg>
</body>`
  it("none", () => {
    const result = getAttrPaths(html, "meta", "content", "/")
    expect(result).toEqual([])
  })
  it("link href", () => {
    const result = getAttrPaths(html, "link", "href", "/")
    expect(result).toEqual([
      "/apple-touch-icon.png",
      "/favicon.ico",
      "/src/style.css",
      "/src/style2.css",
    ])
  })
  it("script src", () => {
    const result = getAttrPaths(html, "script", "src", "/")
    expect(result).toEqual(["/src/script.js", "/src/script2.js"])
  })
  it("img src", () => {
    const result = getAttrPaths(html, "img", "src", "/")
    expect(result).toEqual(["/image.png", "/image2.svg"])
  })
  it("img src http", () => {
    const result = getAttrPaths(html, "img", "src", "http")
    expect(result).toEqual(["https://picsum.photos/id/1/800/600"])
  })
  it("source srcset", () => {
    const result = getAttrPaths(html, "source", "srcset", "/")
    expect(result).toEqual([
      "/image-320x157.webp",
      "/image-400x196.webp",
      "/image-640x314.webp",
    ])
  })
  it("use href", () => {
    const result = getAttrPaths(html, "use", "href", "/")
    expect(result).toEqual(["/sprite.svg"])
  })
})

describe("convertPathToEntryId", () => {
  it("basic", () => {
    const result = convertPathToEntryId("path/to/nest\\nest\\index.html")
    expect(result).toEqual(
      "path__slash__to__slash__nest__backSlash__nest__backSlash__index__dot__html"
    )
  })
})

describe("convertEntryIdToPath", () => {
  it("basic", () => {
    const result = convertEntryIdToPath(
      "path__slash__to__slash__nest__backSlash__nest__backSlash__index__dot__html"
    )
    expect(result).toEqual("path/to/nest\\nest\\index.html")
  })
})
