import fs from "node:fs"
import path from "node:path"
import { spawn } from "node:child_process"
import { fileURLToPath } from "node:url"

import { afterAll, beforeAll, describe, expect, test } from "vitest"

const here = path.dirname(fileURLToPath(import.meta.url))
const packageDir = path.resolve(here, "../..")
const fixtureDir = path.resolve(here, "../fixtures/compat-basic")
const binFile = path.resolve(packageDir, "bin/minista.js")
const distDir = path.resolve(fixtureDir, "dist")
const tempDir = path.resolve(fixtureDir, "node_modules/.minista")
const viteCacheDir = path.resolve(fixtureDir, "node_modules/.vite")
const viteConfigCacheDir = path.resolve(fixtureDir, "node_modules/.vite-temp")

function runBuild() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [binFile, "build", fixtureDir], {
      cwd: packageDir,
      env: { ...process.env, NO_COLOR: "1" },
      stdio: ["ignore", "pipe", "pipe"],
    })

    let stdout = ""
    let stderr = ""
    child.stdout.on("data", (chunk) => (stdout += chunk))
    child.stderr.on("data", (chunk) => (stderr += chunk))
    child.on("error", reject)
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr })
      else reject(new Error(`fixture build exited ${code}\n${stdout}\n${stderr}`))
    })
  })
}

async function removeGenerated() {
  await Promise.all([
    fs.promises.rm(distDir, { recursive: true, force: true }),
    fs.promises.rm(tempDir, { recursive: true, force: true }),
    fs.promises.rm(viteCacheDir, { recursive: true, force: true }),
    fs.promises.rm(viteConfigCacheDir, { recursive: true, force: true }),
  ])
}

describe.sequential("v4 compatibility build", () => {
  beforeAll(async () => {
    await removeGenerated()
    await runBuild()
  }, 60_000)

  afterAll(removeGenerated)

  test("emits the documented page and head contract", async () => {
    const html = await fs.promises.readFile(path.resolve(distDir, "index.html"), "utf8")

    expect(html).toContain("<!doctype html>")
    expect(html).toContain('<html lang="en">')
    expect(html).toContain('<body class="fixture" data-search-relative="0">')
    expect(html).toContain("<title>Compatibility fixture</title>")
    expect(html).toContain("<!-- fixture comment -->")
    expect(html).not.toContain("data-minista-comment")
    expect(html).toContain("<h1>Compatibility fixture</h1>")
    expect(html).toContain('<svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 2">')
    expect(html).toContain("<title>Pixel icon</title>")
    expect(html).toContain('<path fill="#123456"')
    expect(html).not.toContain("data-minista-svg")
    expect(html).toContain('href="/assets/assets.svg#pixel"')
    expect(html).not.toContain("data-minista-sprite")
    expect(html).not.toMatch(/<body[^>]*>\s*<link rel="preload" as="image"/)
  })

  test("emits image, entry, island, and search artifacts", async () => {
    const files = (await fs.promises.readdir(distDir, { recursive: true }))
      .map(String)
      .sort()

    expect(files).toContain("assets/pixel-2x2.png")
    expect(files).toContain("assets/search.json")
    expect(files).toContain("assets/assets.svg")
    expect(files).toContain("assets/site.css")
    expect(files).toContain("scripts/client.js")
    expect(files).toContain("scripts/island-1.js")
    expect(files).toContain("dist.zip")

    const html = await fs.promises.readFile(path.resolve(distDir, "index.html"), "utf8")
    expect(html).toContain('src="/assets/pixel-2x2.png"')
    expect(html).toContain('src="/scripts/client.js"')
    expect(html).toContain('src="/scripts/island-1.js"')

    const search = JSON.parse(
      await fs.promises.readFile(path.resolve(distDir, "assets/search.json"), "utf8"),
    )
    expect(search.words).toEqual(
      expect.arrayContaining(["Compatibility", "fixture"]),
    )
    expect(search.pages).toMatchObject([{ url: "/" }])
  })

  test("records the current executable temp handoff", async () => {
    const ssgFile = path.resolve(tempDir, "ssg/__minista-ssg.mjs")
    const source = await fs.promises.readFile(ssgFile, "utf8")

    expect(source).toContain("export const ssgPages")
    expect(source).toContain("Compatibility fixture")
  })
})
