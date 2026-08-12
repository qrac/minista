import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { afterAll, beforeAll, describe, expect, test } from "vitest"

import { ViteAppBuilderAdapter } from "../../src/adapters/vite/app-builder.js"
import { attachViteBuildSession } from "../../src/adapters/vite/build-session.js"
import { MemoryArtifactStore } from "../../src/core/artifacts/index.js"

const here = path.dirname(fileURLToPath(import.meta.url))
const packageDir = path.resolve(here, "../..")
const sourceFixtureDir = path.resolve(here, "../fixtures/compat-basic")
let fixtureDir = ""

describe.sequential("v4 compatibility App Build", () => {
  /** @type {import("vite").ViteBuilder | undefined} */
  let builder

  beforeAll(async () => {
    const testTempDir = path.resolve(packageDir, "test/.tmp")
    await fs.promises.mkdir(testTempDir, { recursive: true })
    fixtureDir = await fs.promises.mkdtemp(
      path.resolve(testTempDir, "compat-app-build-"),
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

    const result = await new ViteAppBuilderAdapter().build(
      attachViteBuildSession(
        {
          root: fixtureDir,
          configFile: path.resolve(fixtureDir, "vite.config.js"),
          logLevel: "silent",
        },
        { artifacts: new MemoryArtifactStore() },
      ),
    )
    builder = result.builder
  }, 60_000)

  afterAll(async () => {
    if (fixtureDir) {
      await fs.promises.rm(fixtureDir, { recursive: true, force: true })
    }
  })

  test("builds render and client in one Vite Builder", () => {
    expect(builder?.environments.render?.isBuilt).toBe(true)
    expect(builder?.environments.client?.isBuilt).toBe(true)
  })

  test("emits the existing page, entry, and Island contract", async () => {
    const distDir = path.resolve(fixtureDir, "dist")
    const files = (await fs.promises.readdir(distDir, { recursive: true }))
      .map(String)
      .sort()
    const html = await fs.promises.readFile(
      path.resolve(distDir, "index.html"),
      "utf8",
    )

    expect(files).toEqual(
      expect.arrayContaining([
        "assets/assets.svg",
        "assets/pixel-2x2.png",
        "assets/search.json",
        "assets/site.css",
        "dist.zip",
        "scripts/client.js",
        "scripts/island-1.js",
      ]),
    )
    expect(html).toContain('<html lang="en">')
    expect(html).toContain('<body class="fixture" data-search-relative="0">')
    expect(html).toContain("<title>Compatibility fixture</title>")
    expect(html).toContain('src="/scripts/client.js"')
    expect(html).toContain('src="/scripts/island-1.js"')
    expect(html).toContain('href="/assets/site.css"')
  })

  test("does not run client-only output hooks in render", async () => {
    await expect(
      fs.promises.access(
        path.resolve(
          fixtureDir,
          "node_modules/.minista/ssr/dist.zip",
        ),
      ),
    ).rejects.toMatchObject({ code: "ENOENT" })
  })
})
