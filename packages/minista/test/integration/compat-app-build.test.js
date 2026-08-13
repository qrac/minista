import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { afterAll, beforeAll, describe, expect, test } from "vitest"

import { ViteAppBuilderAdapter } from "../../src/adapters/vite/app-builder.js"
import {
  attachViteBuildSession,
  createViteBuildSession,
} from "../../src/adapters/vite/build-session.js"
import { MemoryArtifactStore } from "../../src/core/artifacts/index.js"

const here = path.dirname(fileURLToPath(import.meta.url))
const packageDir = path.resolve(here, "../..")
const sourceFixtureDir = path.resolve(here, "../fixtures/compat-basic")
let fixtureDir = ""

describe.sequential("v4 compatibility App Build", () => {
  /** @type {import("../../src/adapters/vite/app-builder.js").ViteAppBuildResult["environments"] | undefined} */
  let environments
  /** @type {import("../../src/core/manifest/index.js").OutputManifest | undefined} */
  let outputManifest

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
        createViteBuildSession({ artifacts: new MemoryArtifactStore() }),
      ),
    )
    environments = result.environments
    outputManifest = result.outputManifest
  }, 60_000)

  afterAll(async () => {
    if (fixtureDir) {
      await fs.promises.rm(fixtureDir, { recursive: true, force: true })
    }
  })

  test("builds render and client in one Vite Builder", () => {
    expect(environments?.render.status).toBe("built")
    expect(environments?.client.status).toBe("built")
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
    expect(outputManifest?.files.map(({ fileName }) => fileName)).toEqual(
      files.filter((file) => file !== "assets" && file !== "scripts"),
    )
    expect(JSON.stringify(outputManifest)).not.toContain(fixtureDir)
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

  test("writes a safe public project manifest atomically", async () => {
    const manifestFile = path.resolve(fixtureDir, ".minista/manifest.json")
    const source = await fs.promises.readFile(manifestFile, "utf8")
    const manifest = JSON.parse(source)

    expect(manifest).toMatchObject({
      schemaVersion: "1",
      generator: { name: "minista" },
      project: { name: "minista-v5-compat-basic", root: "." },
      diagnosticSummary: { errors: 0, warnings: 0, info: 0 },
    })
    expect(manifest.routes).not.toHaveLength(0)
    expect(manifest.pages).not.toHaveLength(0)
    expect(manifest.pages[0].output).toEqual({
      fileName: "index.html",
      url: "/index.html",
    })
    expect(manifest.outputs.map(
      (/** @type {{fileName: string}} */ { fileName }) => fileName,
    )).toEqual(
      outputManifest?.files.map(({ fileName }) => fileName),
    )
    const pageArtifact = manifest.artifacts.find(
      (/** @type {{kind: string}} */ item) => item.kind === "html",
    )
    expect(pageArtifact).toMatchObject({
      owner: "feature:ssg",
      output: { fileName: "index.html", url: "/index.html" },
    })
    expect(manifest.assets).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: "generated",
        consumers: [manifest.pages[0].id],
        output: expect.objectContaining({ fileName: "index.html" }),
      }),
    ]))
    expect(source.endsWith("\n")).toBe(true)
    expect(source).not.toContain(fixtureDir)
    expect(source).not.toContain('"props"')
    await expect(
      fs.promises.readdir(path.resolve(fixtureDir, ".minista")),
    ).resolves.toEqual(["diagnostics.json", "manifest.json"])
    const diagnostics = JSON.parse(await fs.promises.readFile(
      path.resolve(fixtureDir, ".minista/diagnostics.json"),
      "utf8",
    ))
    expect(diagnostics).toMatchObject({
      schemaVersion: "1",
      command: "build",
      summary: { errors: 0, warnings: 0, info: 0 },
      diagnostics: [],
    })
    expect(diagnostics.createdAt).toBe(manifest.createdAt)
  })
})
