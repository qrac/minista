import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { afterAll, beforeAll, describe, expect, test } from "vitest"

import { ViteAppBuilderAdapter } from "../../src/adapters/vite/app-builder.js"
import { attachViteBuildSession } from "../../src/adapters/vite/build-session.js"
import { MemoryArtifactStore } from "../../src/core/artifacts/index.js"

const here = path.dirname(fileURLToPath(import.meta.url))
const packageDir = path.resolve(here, "../..")
const sourceFixtureDir = path.resolve(here, "../fixtures/preact-basic")
let fixtureDir = ""

describe.sequential("Preact compatibility App Build", () => {
  beforeAll(async () => {
    const testTempDir = path.resolve(packageDir, "test/.tmp")
    await fs.promises.mkdir(testTempDir, { recursive: true })
    fixtureDir = await fs.promises.mkdtemp(
      path.resolve(testTempDir, "preact-app-build-"),
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

    await new ViteAppBuilderAdapter().build(
      attachViteBuildSession(
        {
          root: fixtureDir,
          configFile: path.resolve(fixtureDir, "vite.config.js"),
          logLevel: "silent",
        },
        { artifacts: new MemoryArtifactStore() },
      ),
    )
  }, 60_000)

  afterAll(async () => {
    if (fixtureDir) {
      await fs.promises.rm(fixtureDir, { recursive: true, force: true })
    }
  })

  test("isolates the client Preact alias and emits the island", async () => {
    const distDir = path.resolve(fixtureDir, "dist")
    const html = await fs.promises.readFile(
      path.resolve(distDir, "index.html"),
      "utf8",
    )
    const files = (await fs.promises.readdir(distDir, { recursive: true }))
      .map(String)
      .sort()

    expect(html).toContain("<h1>Preact compatibility</h1>")
    expect(html).toMatch(/src="\/assets\/island-1-[^"]+\.js"/)
    expect(
      files.some((file) => /^assets\/island-1-.+\.js$/.test(file)),
    ).toBe(true)
    expect(files.filter((file) => /thumb-.+\.svg$/.test(file))).toHaveLength(1)
  })
})
