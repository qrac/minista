import fs from "node:fs"
import path from "node:path"
import { spawn } from "node:child_process"
import { fileURLToPath } from "node:url"

import { afterAll, describe, expect, test } from "vitest"

const here = path.dirname(fileURLToPath(import.meta.url))
const packageDir = path.resolve(here, "../..")
const binFile = path.resolve(packageDir, "bin/minista.js")
const fixtureDir = path.resolve(here, "../fixtures/check-basic")
const invalidFixtureDir = path.resolve(here, "../fixtures/check-invalid")
let manifestFixtureDir = ""

/** @param {string[]} args */
function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [binFile, ...args], {
      cwd: packageDir,
      env: { ...process.env, NO_COLOR: "1" },
      stdio: ["ignore", "pipe", "pipe"],
    })
    let stdout = ""
    let stderr = ""
    child.stdout.on("data", (chunk) => (stdout += chunk))
    child.stderr.on("data", (chunk) => (stderr += chunk))
    child.on("error", reject)
    child.on("close", (code) => resolve({ code, stdout, stderr }))
  })
}

afterAll(async () => {
  await Promise.all(
    [fixtureDir, invalidFixtureDir].flatMap((root) =>
      [".minista", ".vite", ".vite-temp"].map((directory) =>
        fs.promises.rm(path.resolve(root, "node_modules", directory), {
          recursive: true,
          force: true,
        }),
      ),
    ),
  )
  if (manifestFixtureDir) {
    await fs.promises.rm(manifestFixtureDir, { recursive: true, force: true })
  }
})

describe.sequential("machine-readable project commands", () => {
  test("check resolves static paths without emitting dist", async () => {
    const result = await run(["check", fixtureDir, "--json"])
    const json = JSON.parse(result.stdout)

    expect(result.code).toBe(0)
    expect(result.stderr).toBe("")
    expect(json).toMatchObject({
      schemaVersion: "1",
      command: "check",
      ok: true,
      data: { counts: { routes: 2, pages: 3 } },
      diagnostics: [],
    })
    expect(fs.existsSync(path.resolve(fixtureDir, "dist"))).toBe(false)
  }, 30_000)

  test("inspect and explain use the same graph service", async () => {
    const inspectResult = await run(["inspect", fixtureDir, "--json"])
    const inspection = JSON.parse(inspectResult.stdout)
    const routeId = inspection.data.routes.find(
      (/** @type {{pattern: string}} */ { pattern }) =>
        pattern === "/posts/:slug",
    ).id
    const explainResult = await run([
      "explain",
      routeId,
      fixtureDir,
      "--json",
    ])
    const explanation = JSON.parse(explainResult.stdout)

    expect(explanation).toMatchObject({
      command: "explain",
      ok: true,
      data: {
        target: routeId,
        kind: "route",
        found: true,
      },
    })
    expect(explanation.data.relatedNodeIds).toHaveLength(2)
  }, 30_000)

  test("check reports missing params and exits non-zero", async () => {
    const result = await run(["check", invalidFixtureDir, "--json"])
    const json = JSON.parse(result.stdout)

    expect(result.code).toBe(1)
    expect(json.ok).toBe(false)
    expect(json.diagnostics[0]).toMatchObject({
      code: "MINISTA_ROUTE_MISSING_PARAM",
      severity: "error",
      phase: "resolve",
    })
  }, 30_000)

  test("inspect reads a manifest without starting a source project", async () => {
    const testTempDir = path.resolve(packageDir, "test/.tmp")
    await fs.promises.mkdir(testTempDir, { recursive: true })
    manifestFixtureDir = await fs.promises.mkdtemp(
      path.resolve(testTempDir, "manifest-inspect-"),
    )
    const directory = path.resolve(manifestFixtureDir, ".minista")
    const file = path.resolve(directory, "manifest.json")
    const manifest = {
      schemaVersion: "1",
      generator: { name: "minista", version: "5.0.0" },
      project: { id: "project:manifest-only", name: "manifest-only", root: "." },
      features: [],
      routes: [{
        id: "route:index",
        sourceFile: "src/pages/index.jsx",
        pattern: "/",
        params: [],
      }],
      pages: [{
        id: "page:index",
        routeId: "route:index",
        url: "/",
        params: {},
        draft: false,
      }],
      assets: [],
      artifacts: [],
      diagnosticSummary: { errors: 0, warnings: 0, info: 0 },
      createdAt: "2026-08-13T00:00:00.000Z",
    }
    await fs.promises.mkdir(directory)
    await fs.promises.writeFile(file, JSON.stringify(manifest), "utf8")

    const result = await run([
      "inspect",
      manifestFixtureDir,
      "--manifest",
      "--json",
    ])
    const json = JSON.parse(result.stdout)

    expect(result).toMatchObject({ code: 0, stderr: "" })
    expect(json).toMatchObject({
      command: "inspect",
      ok: true,
      data: {
        project: { name: "manifest-only" },
        counts: { routes: 1, pages: 1 },
      },
      diagnostics: [],
    })

    await fs.promises.writeFile(
      file,
      JSON.stringify({ schemaVersion: "2" }),
      "utf8",
    )
    const unsupported = await run([
      "inspect",
      manifestFixtureDir,
      "--manifest",
      "--json",
    ])
    const unsupportedJson = JSON.parse(unsupported.stdout)
    expect(unsupported).toMatchObject({ code: 1, stderr: "" })
    expect(unsupportedJson.diagnostics[0]).toMatchObject({
      code: "MINISTA_MANIFEST_VERSION_UNSUPPORTED",
      severity: "error",
    })
  }, 30_000)
})
