import type { HTMLElement as NHTMLElement } from "node-html-parser"
import { describe, expect, it, beforeAll, afterEach, afterAll } from "vitest"
import path from "node:path"
import { fileURLToPath } from "node:url"
import fs from "fs-extra"
import { parse as parseHtml } from "node-html-parser"
import { rest } from "msw"
import { setupServer } from "msw/node"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

import {
  getRemoteList,
  getRemoteExt,
  fetchRemote,
} from "../../src/transform/remote"

describe("getRemoteList", () => {
  it("Default", () => {
    const htmlStr = `<img data-minista-image-src="A"><img ><img data-minista-image-src="B">`
    const parsedHtml = parseHtml(htmlStr) as NHTMLElement
    const elements = parsedHtml.querySelectorAll("img")
    const list = getRemoteList(elements)
    const result = list.map((item) => item.src)
    expect(result).toEqual(["A", "B"])
  })
})

describe("getRemoteExt", () => {
  it("Default", () => {
    const result = getRemoteExt("http://example/image.png")
    expect(result).toEqual("png")
  })

  it("With param", () => {
    const result = getRemoteExt("http://example/image.png?test=true")
    expect(result).toEqual("png")
  })

  it("Ext none", () => {
    const result = getRemoteExt("http://example/image")
    expect(result).toEqual("")
  })
})

describe("fetchRemote", () => {
  const urls = {
    withExt: "http://example.com/image.png",
    noExt: "http://example.com/image",
    notfound: "http://example.com/notfound",
  }
  const matchUrls = new RegExp(`^${urls.withExt}|${urls.noExt}$`)
  const imagePath = path.join(__dirname, "../_data/image.png")
  const imageData = fs.readFileSync(imagePath)
  const server = setupServer(
    rest.get(matchUrls, (req, res, ctx) => {
      return res(
        ctx.status(200),
        ctx.set("Content-Type", "image/png"),
        ctx.body(imageData)
      )
    }),
    rest.get(urls.notfound, (req, res, ctx) => {
      return res(ctx.status(404))
    })
  )
  beforeAll(() => server.listen())
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  it("With ext", async () => {
    const result = await fetchRemote({
      url: urls.withExt,
      outDir: "/",
      remoteName: "remote",
      remoteCount: 1,
    })
    expect(result).toEqual({
      url: urls.withExt,
      fileName: "/remote-1.png",
      data: imageData,
    })
  })

  it("No ext", async () => {
    const result = await fetchRemote({
      url: urls.noExt,
      outDir: "/",
      remoteName: "remote",
      remoteCount: 1,
    })
    expect(result).toEqual({
      url: urls.noExt,
      fileName: "/remote-1.png",
      data: imageData,
    })
  })

  it("Notfound", async () => {
    const result = await fetchRemote({
      url: urls.notfound,
      outDir: "/",
      remoteName: "remote",
      remoteCount: 1,
    })
    expect(result).toEqual({
      url: urls.notfound,
      fileName: "",
      data: "",
    })
  })
})
