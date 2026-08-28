import fs from "node:fs"
import path from "node:path"
import { spawn } from "node:child_process"
import { fileURLToPath } from "node:url"

import { afterAll, beforeAll, describe, expect, test } from "vitest"

const here = path.dirname(fileURLToPath(import.meta.url))
const packageDir = path.resolve(here, "../..")
const fixtureDir = path.resolve(here, "../fixtures/plugin-mismatch")
const binFile = path.resolve(packageDir, "bin/minista.js")
const distDir = path.resolve(fixtureDir, "dist")
const nodeModulesDir = path.resolve(fixtureDir, "node_modules")
let stderr = ""

function runBuild() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [binFile, "build", fixtureDir], {
      cwd: packageDir,
      env: { ...process.env, NO_COLOR: "1" },
      stdio: ["ignore", "pipe", "pipe"],
    })
    let stdout = ""
    child.stdout.on("data", (chunk) => (stdout += chunk))
    child.stderr.on("data", (chunk) => (stderr += chunk))
    child.on("error", reject)
    child.on("close", (code) => {
      if (code === 0) resolve(undefined)
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

describe.sequential("config plugin mismatch fallback", () => {
  beforeAll(async () => {
    await removeGenerated()
    await runBuild()
  }, 60_000)

  afterAll(removeGenerated)

  test("reports the stable diagnostic and uses the legacy builder", async () => {
    expect(stderr).toContain("[MINISTA_VITE_APP_CONFIG_PLUGIN_MISMATCH]")
    const html = await fs.promises.readFile(
      path.resolve(distDir, "index.html"),
      "utf8",
    )
    expect(html).toContain("<h1>Legacy plugin fallback</h1>")
    expect(html.match(/<!doctype html>/gi)).toHaveLength(1)
    expect(html.match(/<html/g)).toHaveLength(1)
    expect(html.match(/<head/g)).toHaveLength(1)
    expect(html.match(/<body/g)).toHaveLength(1)
    expect(html).toContain('<html lang="en">')

    const [manifest, diagnostics] = await Promise.all([
      fs.promises.readFile(
        path.resolve(fixtureDir, ".minista/manifest.json"),
        "utf8",
      ).then(JSON.parse),
      fs.promises.readFile(
        path.resolve(fixtureDir, ".minista/diagnostics.json"),
        "utf8",
      ).then(JSON.parse),
    ])
    expect(manifest).toMatchObject({
      schemaVersion: "1",
      project: { name: "plugin-mismatch" },
    })
    expect(diagnostics).toMatchObject({
      command: "build",
      summary: { warnings: 1 },
      diagnostics: [{
        code: "MINISTA_VITE_APP_CONFIG_PLUGIN_MISMATCH",
        severity: "warning",
      }],
    })
  })
})
