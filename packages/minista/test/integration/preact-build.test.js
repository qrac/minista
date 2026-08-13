import fs from "node:fs"
import path from "node:path"
import { spawn } from "node:child_process"
import { fileURLToPath } from "node:url"

import { afterAll, beforeAll, describe, expect, test } from "vitest"

const here = path.dirname(fileURLToPath(import.meta.url))
const packageDir = path.resolve(here, "../..")
const fixtureDir = path.resolve(here, "../fixtures/preact-basic")
const binFile = path.resolve(packageDir, "bin/minista.js")
const distDir = path.resolve(fixtureDir, "dist")
const nodeModulesDir = path.resolve(fixtureDir, "node_modules")

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
    fs.promises.rm(path.resolve(fixtureDir, ".minista"), {
      recursive: true,
      force: true,
    }),
    fs.promises.rm(path.resolve(nodeModulesDir, ".minista"), {
      recursive: true,
      force: true,
    }),
    fs.promises.rm(path.resolve(nodeModulesDir, ".vite"), {
      recursive: true,
      force: true,
    }),
    fs.promises.rm(path.resolve(nodeModulesDir, ".vite-temp"), {
      recursive: true,
      force: true,
    }),
  ])
  await fs.promises.rmdir(nodeModulesDir).catch(() => {})
}

describe.sequential("Preact compatibility build", () => {
  beforeAll(async () => {
    await removeGenerated()
    await runBuild()
  }, 60_000)

  afterAll(removeGenerated)

  test("uses the compatibility renderer and emits the Preact island", async () => {
    const html = await fs.promises.readFile(path.resolve(distDir, "index.html"), "utf8")
    const files = (await fs.promises.readdir(distDir, { recursive: true }))
      .map(String)
      .sort()

    expect(html).toContain("<h1>Preact compatibility</h1>")
    expect(html).toMatch(/src="\/assets\/island-1-[^"]+\.js"/)
    expect(files.some((file) => /^assets\/island-1-.+\.js$/.test(file))).toBe(true)
  })
})
