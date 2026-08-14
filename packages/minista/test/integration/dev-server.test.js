import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { afterAll, beforeAll, describe, expect, test, vi } from "vitest"

import { ViteDevServerAdapter } from "../../src/adapters/vite/dev-server.js"
import { getViteBuildSession } from "../../src/adapters/vite/build-session.js"

const here = path.dirname(fileURLToPath(import.meta.url))
const packageDir = path.resolve(here, "../..")
const sourceFixtureDir = path.resolve(here, "../fixtures/compat-basic")
let fixtureDir = ""
let origin = ""
/** @type {import("../../src/adapters/vite/dev-server.js").ViteDevServerResult | undefined} */
let running
let html = ""
let cachedHtml = ""
let reloadClient = ""
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
    await fs.promises.writeFile(
      path.resolve(fixtureDir, "src/pages/other.jsx"),
      `let renders = 0
let staticDataRuns = 0
export function getStaticDataRuns() {
  return staticDataRuns
}
export async function getStaticData() {
  staticDataRuns += 1
  return { props: {} }
}
export default function Other() {
  renders += 1
  return <h1>Other renders: {renders}</h1>
}
`,
      "utf8",
    )
    const indexFile = path.resolve(fixtureDir, "src/pages/index.jsx")
    const indexSource = await fs.promises.readFile(indexFile, "utf8")
    await Promise.all([
      fs.promises.writeFile(
        indexFile,
        indexSource.replace(
          '<Image src="/src/assets/pixel.svg" alt="Pixel" width={2} height={2} />',
          `<Image src="/src/assets/pixel.svg" alt="Pixel" width={2} height={2} />
        <Image src="/src/assets/photo.svg" alt="Photo" width={2} height={2} />`,
        ),
        "utf8",
      ),
      fs.promises.writeFile(
        path.resolve(fixtureDir, "src/assets/photo.svg"),
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 2">
  <circle cx="1" cy="1" r="1" fill="#abcdef" />
</svg>
`,
        "utf8",
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
    const reloadClientPath = html.match(
      /src="([^"]+html-proxy[^"]+)"/,
    )?.[1]
    if (!reloadClientPath) {
      throw new Error("The targeted reload client was not injected.")
    }
    reloadClient = await fetch(new URL(reloadClientPath, origin), {
      signal: AbortSignal.timeout(10_000),
    }).then((response) => response.text())
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
    expect(html).toContain("/@__minista-bundle-glob")
    expect(reloadClient).toContain("minista:full-reload")
    expect(cachedHtml).toContain("<h1>Compatibility fixture</h1>")
    expect(cachedHtml).toContain("/@vite/client")
    expect(search.words).toEqual(
      expect.arrayContaining(["Compatibility", "fixture"]),
    )
    const session = running
      ? getViteBuildSession(running.server.config)
      : undefined
    const scopes = session?.state?.compatibilityTraces?.map(({ scope }) => scope)
    expect(scopes).toEqual(expect.arrayContaining([
      "bundle:dev",
      "comment:dev",
      "image:dev",
      "island:dev",
      "search:dev",
      "sprite:dev",
      "ssg:dev-render",
      "svg:dev",
    ]))
    expect(session?.state?.compatibilityDocuments?.list().length).toBeGreaterThan(
      0,
    )
  })

  test("invalidates the cached page snapshot after a source change", async () => {
    if (!running) throw new Error("The dev server is not running.")
    const hotSend = vi.spyOn(running.server.environments.client.hot, "send")
    const otherBefore = await fetch(`${origin}/other`, {
      signal: AbortSignal.timeout(10_000),
    }).then((response) => response.text())
    expect(otherBefore).toContain("<h1>Other renders: <!-- -->1</h1>")

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
      if (updatedHtml.includes("<h1>Compatibility updated</h1>")) {
        const otherAfter = await fetch(`${origin}/other`, {
          signal: AbortSignal.timeout(10_000),
        }).then((response) => response.text())
        expect(otherAfter).toContain("<h1>Other renders: <!-- -->1</h1>")
        const otherModule = await /** @type {any} */ (
          running.server.environments.ssr
        ).runner.import(path.resolve(fixtureDir, "src/pages/other.jsx"))
        expect(otherModule.getStaticDataRuns()).toBe(1)
        expect(hotSend).toHaveBeenCalledWith(
          "minista:full-reload",
          { paths: ["/"] },
        )
        hotSend.mockRestore()
        return
      }
      await new Promise((resolve) => setTimeout(resolve, 50))
    }

    hotSend.mockRestore()
    throw new Error(
      "The dev page cache was not invalidated after a source change.",
    )
  }, 15_000)

  test("reloads only pages connected to a changed sprite artifact", async () => {
    if (!running) throw new Error("The dev server is not running.")
    const hotSend = vi.spyOn(running.server.environments.client.hot, "send")
    const spriteFile = path.resolve(fixtureDir, "src/assets/pixel.svg")
    const source = await fs.promises.readFile(spriteFile, "utf8")
    await fs.promises.writeFile(
      spriteFile,
      source.replace("#123456", "#654321"),
      "utf8",
    )

    const deadline = Date.now() + 10_000
    while (Date.now() < deadline) {
      const targetedReload = hotSend.mock.calls.find(
        ([event, payload]) =>
          event === "minista:full-reload" &&
          JSON.stringify(payload) === JSON.stringify({ paths: ["/"] }),
      )
      if (targetedReload) {
        expect(targetedReload[1]).not.toMatchObject({ paths: ["/other"] })
        hotSend.mockRestore()
        return
      }
      await new Promise((resolve) => setTimeout(resolve, 50))
    }

    hotSend.mockRestore()
    throw new Error("The changed sprite artifact did not target its page.")
  }, 15_000)

  test("reloads only pages connected to a changed image artifact", async () => {
    if (!running) throw new Error("The dev server is not running.")
    const hotSend = vi.spyOn(running.server.environments.client.hot, "send")
    const imageFile = path.resolve(fixtureDir, "src/assets/photo.svg")
    const source = await fs.promises.readFile(imageFile, "utf8")
    await fs.promises.writeFile(
      imageFile,
      source.replace("#abcdef", "#fedcba"),
      "utf8",
    )

    const deadline = Date.now() + 10_000
    while (Date.now() < deadline) {
      const targetedReload = hotSend.mock.calls.find(
        ([event, payload]) =>
          event === "minista:full-reload" &&
          JSON.stringify(payload) === JSON.stringify({ paths: ["/"] }),
      )
      if (targetedReload) {
        expect(targetedReload[1]).not.toMatchObject({ paths: ["/other"] })
        hotSend.mockRestore()
        return
      }
      await new Promise((resolve) => setTimeout(resolve, 50))
    }

    hotSend.mockRestore()
    throw new Error("The changed image artifact did not target its page.")
  }, 15_000)
})
