import { createElement } from "react"
import { describe, expect, it, vi } from "vitest"

import { pluginSsg } from "../../../src/plugins/ssg/index.js"

function createMiddleware(base) {
  let middleware
  const server = {
    config: { base },
    middlewares: { use(fn) { middleware = fn } },
    ssrLoadModule: vi.fn(async () => ({
      PAGES: {
        "/src/pages/index.jsx": {
          default: () => createElement("p", null, "Root page"),
        },
        "/src/pages/builds/index.jsx": {
          default: () => createElement("p", null, "Builds page"),
        },
        "/src/pages/about.jsx": {
          default: () => createElement("p", null, "About page"),
        },
      },
    })),
    moduleGraph: { getModuleById: () => null },
    transformIndexHtml: vi.fn(async (_url, html) => html),
    ssrFixStacktrace: vi.fn(),
  }
  pluginSsg().configureServer(server)()
  return { middleware, server }
}

function createResponse() {
  return { setHeader: vi.fn(), end: vi.fn() }
}

describe.each(["/", "/site/"])("SSG dev middleware (base: %s)", (base) => {
  const cases = [
    ["", "Root page"],
    ["builds/", "Builds page"],
    ["about", "About page"],
  ].flatMap(([route, content]) =>
    ["", "?build=xwd2aQ", "?build=xwd2aQ&mode=preview", "?"].map(
      (query) => [route + query, content],
    ),
  )

  it.each(cases)("クエリに関係なく %s のページを返す", async (route, content) => {
    const { middleware, server } = createMiddleware(base)
    const originalUrl = base + route
    const req = { originalUrl, url: "/" + route }
    const res = createResponse()
    const next = vi.fn()

    await middleware(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.statusCode).toBe(200)
    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "text/html")
    expect(res.end).toHaveBeenCalledWith(expect.stringContaining(content))
    expect(server.transformIndexHtml).toHaveBeenCalledWith(
      originalUrl,
      expect.stringContaining(content),
    )
    expect(req).toEqual({ originalUrl, url: "/" + route })
  })

  it("クエリ付きの存在しないページは次のミドルウェアへ渡す", async () => {
    const { middleware, server } = createMiddleware(base)
    const req = {
      originalUrl: base + "missing/?build=xwd2aQ",
      url: "/missing/?build=xwd2aQ",
    }
    const res = createResponse()
    const next = vi.fn()

    await middleware(req, res, next)

    expect(next).toHaveBeenCalledExactlyOnceWith()
    expect(res.end).not.toHaveBeenCalled()
    expect(server.transformIndexHtml).not.toHaveBeenCalled()
  })
})
