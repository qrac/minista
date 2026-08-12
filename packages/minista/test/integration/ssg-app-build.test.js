import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { afterAll, beforeAll, describe, expect, test } from "vitest"

import { ViteAppBuilderAdapter } from "../../src/adapters/vite/app-builder.js"
import { attachViteBuildSession } from "../../src/adapters/vite/build-session.js"
import { MemoryArtifactStore } from "../../src/core/artifacts/index.js"
import { createRenderedPagesArtifactId } from "../../src/features/ssg/index.js"

const here = path.dirname(fileURLToPath(import.meta.url))
const fixtureDir = path.resolve(here, "../fixtures/check-basic")
const distDir = path.resolve(fixtureDir, "dist")
const tempDir = path.resolve(fixtureDir, "node_modules/.minista")
const viteCacheDir = path.resolve(fixtureDir, "node_modules/.vite")
const viteConfigCacheDir = path.resolve(fixtureDir, "node_modules/.vite-temp")

async function removeGenerated() {
  await Promise.all([
    fs.promises.rm(distDir, { recursive: true, force: true }),
    fs.promises.rm(tempDir, { recursive: true, force: true }),
    fs.promises.rm(viteCacheDir, { recursive: true, force: true }),
    fs.promises.rm(viteConfigCacheDir, { recursive: true, force: true }),
  ])
}

describe.sequential("SSG App Build", () => {
  const artifacts = new MemoryArtifactStore()
  /** @type {import("vite").ViteBuilder | undefined} */
  let builder

  beforeAll(async () => {
    await removeGenerated()
    const result = await new ViteAppBuilderAdapter().build(
      attachViteBuildSession(
        {
          root: fixtureDir,
          configFile: path.resolve(fixtureDir, "vite.config.js"),
          logLevel: "silent",
        },
        { artifacts },
      ),
    )
    builder = result.builder
  }, 60_000)

  afterAll(removeGenerated)

  test("builds the named environments in one builder", () => {
    expect(builder?.environments.render?.isBuilt).toBe(true)
    expect(builder?.environments.client?.isBuilt).toBe(true)
  })

  test("hands rendered pages to the client through the artifact store", async () => {
    const artifact = await artifacts.get(createRenderedPagesArtifactId())
    /** @type {import("../../src/plugins/ssg/types.js").SsgPage[]} */
    const pages = JSON.parse(String(artifact?.content))

    expect(pages).toHaveLength(3)
    expect(pages.map((page) => page.url)).toEqual([
      "/",
      "/posts/one",
      "/posts/two",
    ])
    await expect(
      fs.promises.readFile(path.resolve(distDir, "index.html"), "utf8"),
    ).resolves.toContain("<h1>Index</h1>")
  })
})
