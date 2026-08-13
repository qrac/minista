import fs from "node:fs"
import path from "node:path"
import { spawn } from "node:child_process"
import { fileURLToPath } from "node:url"

import { afterAll, beforeAll, describe, expect, test } from "vitest"

const here = path.dirname(fileURLToPath(import.meta.url))
const packageDir = path.resolve(here, "../..")
const sourceFixtureDir = path.resolve(here, "../fixtures/check-basic")
const sourceInvalidFixtureDir = path.resolve(here, "../fixtures/check-invalid")
const binFile = path.resolve(packageDir, "bin/minista.js")
let fixtureDir = ""
let invalidFixtureDir = ""

/** @param {string} source @param {string} prefix */
async function copyFixture(source, prefix) {
  const testTempDir = path.resolve(packageDir, "test/.tmp")
  await fs.promises.mkdir(testTempDir, { recursive: true })
  const target = await fs.promises.mkdtemp(path.resolve(testTempDir, prefix))
  await Promise.all([
    fs.promises.copyFile(
      path.resolve(source, "package.json"),
      path.resolve(target, "package.json"),
    ),
    fs.promises.copyFile(
      path.resolve(source, "vite.config.js"),
      path.resolve(target, "vite.config.js"),
    ),
    fs.promises.cp(
      path.resolve(source, "src"),
      path.resolve(target, "src"),
      { recursive: true },
    ),
  ])
  return target
}

/** @param {string} [root] */
function runBuild(root = fixtureDir) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [
      binFile,
      "build",
      root,
      "--minify",
      "false",
    ], {
      cwd: packageDir,
      env: { ...process.env, NO_COLOR: "1" },
      stdio: ["ignore", "pipe", "pipe"],
    })
    let output = ""
    child.stdout.on("data", (chunk) => (output += chunk))
    child.stderr.on("data", (chunk) => (output += chunk))
    child.on("error", reject)
    child.on("close", (code) => resolve({ code, output }))
  })
}

describe.sequential("external Vite CLI build fallback", () => {
  beforeAll(async () => {
    fixtureDir = await copyFixture(
      sourceFixtureDir,
      "external-cli-build-",
    )
    invalidFixtureDir = await copyFixture(
      sourceInvalidFixtureDir,
      "external-cli-invalid-",
    )
    const result = await runBuild()
    if (result.code !== 0) {
      throw new Error(`external build exited ${result.code}\n${result.output}`)
    }
  }, 60_000)

  afterAll(async () => {
    await Promise.all([fixtureDir, invalidFixtureDir].map((root) =>
      fs.promises.rm(root, { recursive: true, force: true })
    ))
  })

  test("promotes metadata only after both external builds succeed", async () => {
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
      project: { name: "minista-v5-check-basic" },
    })
    expect(manifest.pages.find(
      (/** @type {{url: string}} */ page) => page.url === "/",
    )).toMatchObject({ output: { fileName: "index.html" } })
    expect(manifest.outputs.map(
      (/** @type {{fileName: string}} */ { fileName }) => fileName,
    )).toContain(
      "index.html",
    )
    expect(diagnostics).toMatchObject({
      schemaVersion: "1",
      command: "build",
      summary: { errors: 0, warnings: 0, info: 0 },
    })
    await expect(
      fs.promises.access(path.resolve(fixtureDir, ".minista/work")),
    ).rejects.toMatchObject({ code: "ENOENT" })
  })

  test("does not promote or retain a failed build handoff", async () => {
    const result = await runBuild(invalidFixtureDir)

    expect(result.code).not.toBe(0)
    await expect(
      fs.promises.access(path.resolve(invalidFixtureDir, ".minista/manifest.json")),
    ).rejects.toMatchObject({ code: "ENOENT" })
    await expect(
      fs.promises.access(path.resolve(invalidFixtureDir, ".minista/work")),
    ).rejects.toMatchObject({ code: "ENOENT" })
  }, 60_000)
})
