import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { afterAll, beforeAll, describe, expect, test } from "vitest"

import { ViteDevServerAdapter } from "../../src/adapters/vite/dev-server.js"

const here = path.dirname(fileURLToPath(import.meta.url))
const packageDir = path.resolve(here, "../..")
const sourceFixtureDir = path.resolve(here, "../fixtures/compat-basic")
let fixtureDir = ""
let origin = ""
/** @type {import("../../src/adapters/vite/dev-server.js").ViteDevServerResult | undefined} */
let running
let html = ""
let cachedHtml = ""
/** @type {any} */
let search

describe.sequential("programmatic custom dev server", () => {
  beforeAll(async () => {
    const testTempDir = path.resolve(packageDir, "test/.tmp")
    await fs.promises.mkdir(testTempDir, { recursive: true })
    fixtureDir = await fs.promises.mkdtemp(
      path.resolve(testTempDir, "dev-server-"),
    )
    await Promise.all([
      fs.promises.copyFile(
        path.resolve(sourceFixtureDir, "package.json"),
        path.resolve(fixtureDir, "package.json"),
      ),
      fs.promises.copyFile(
        path.resolve(sourceFixtureDir, "vite.config.js"),
        path.resolve(fixtureDir, "vite.config.js"),
      ),
      fs.promises.cp(
        path.resolve(sourceFixtureDir, "src"),
        path.resolve(fixtureDir, "src"),
        { recursive: true },
      ),
    ])

    running = await new ViteDevServerAdapter().start(
      {
        root: fixtureDir,
        configFile: path.resolve(fixtureDir, "vite.config.js"),
        logLevel: "silent",
        server: { host: "127.0.0.1", port: 0, strictPort: true },
      },
      { printUrls: false, bindShortcuts: false },
    )
    const address = running.server.httpServer?.address()
    if (!address || typeof address === "string") {
      throw new Error("Vite dev server did not expose a TCP address.")
    }
    origin = `http://127.0.0.1:${address.port}`
    const response = await fetch(`${origin}/`, {
      signal: AbortSignal.timeout(10_000),
    })
    html = await response.text()
    expect(response.status).toBe(200)
    const cachedResponse = await fetch(
      `${origin}/`,
      { signal: AbortSignal.timeout(10_000) },
    )
    cachedHtml = await cachedResponse.text()
    expect(cachedResponse.status).toBe(200)
    const searchResponse = await fetch(
      `${origin}/@__minista_search_json`,
      { signal: AbortSignal.timeout(10_000) },
    )
    search = await searchResponse.json()
    expect(searchResponse.status).toBe(200)
  }, 60_000)

  afterAll(async () => {
    await running?.close()
    if (fixtureDir) {
      await fs.promises.rm(fixtureDir, { recursive: true, force: true })
    }
  })

  test("owns middleware order with appType custom", () => {
    expect(running?.server.config.appType).toBe("custom")
    expect(html).toContain("<h1>Compatibility fixture</h1>")
    expect(html).toContain("/@vite/client")
    expect(cachedHtml).toContain("<h1>Compatibility fixture</h1>")
    expect(cachedHtml).toContain("/@vite/client")
    expect(search.words).toEqual(
      expect.arrayContaining(["Compatibility", "fixture"]),
    )
  })

  test("invalidates the cached page snapshot after a source change", async () => {
    const pageFile = path.resolve(fixtureDir, "src/pages/index.jsx")
    const source = await fs.promises.readFile(pageFile, "utf8")
    await fs.promises.writeFile(
      pageFile,
      source.replace(
        "<h1>Compatibility fixture</h1>",
        "<h1>Compatibility updated</h1>",
      ),
      "utf8",
    )

    const deadline = Date.now() + 10_000
    while (Date.now() < deadline) {
      const response = await fetch(`${origin}/`, {
        signal: AbortSignal.timeout(10_000),
      })
      const updatedHtml = await response.text()
      if (updatedHtml.includes("<h1>Compatibility updated</h1>")) return
      await new Promise((resolve) => setTimeout(resolve, 50))
    }

    throw new Error(
      "The dev page cache was not invalidated after a source change.",
    )
  }, 15_000)
})
