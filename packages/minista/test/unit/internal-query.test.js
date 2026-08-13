import fs from "node:fs"
import path from "node:path"

import { afterEach, describe, expect, test } from "vitest"

import {
  ProjectManifestNotFoundError,
  ProjectQueryRequestInvalidError,
  queryProject,
  queryProjectManifest,
} from "minista/internal/query"

const tempRoot = path.resolve(
  import.meta.dirname,
  "../.tmp/internal-query",
)

/** @type {import("../../src/core/manifest/index.js").ProjectManifest} */
const manifest = {
  schemaVersion: "1",
  generator: { name: "minista", version: "5.0.0" },
  project: { id: "project:fixture", name: "fixture", root: "." },
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
    output: { fileName: "index.html", url: "/index.html" },
  }],
  assets: [{
    id: "asset:client",
    kind: "generated",
    consumers: ["page:index"],
    output: { fileName: "assets/client.js", url: "/assets/client.js" },
  }],
  artifacts: [{
    id: "artifact:client",
    kind: "script",
    owner: "feature:entry",
    output: { fileName: "assets/client.js", url: "/assets/client.js" },
    dependencies: [],
  }],
  outputs: [{
    logicalId: "client",
    kind: "chunk",
    fileName: "assets/client.js",
    url: "/assets/client.js",
    byteSize: 10,
    isEntry: true,
    isDynamicEntry: false,
    imports: [],
    dynamicImports: [],
  }],
  diagnosticSummary: { errors: 0, warnings: 0, info: 0 },
  createdAt: "2026-08-13T00:00:00.000Z",
}

afterEach(async () => {
  await fs.promises.rm(tempRoot, { recursive: true, force: true })
})

describe("internal read-only query boundary", () => {
  test("traces Page outputs from an in-memory manifest", () => {
    expect(queryProjectManifest(manifest, {
      kind: "trace-page",
      target: "/",
    })).toMatchObject({
      found: true,
      route: { id: "route:index" },
      page: { id: "page:index" },
      assets: [{ id: "asset:client" }],
      artifacts: [{ id: "artifact:client", owner: "feature:entry" }],
      outputs: [{ fileName: "assets/client.js" }],
    })
    expect(() => queryProjectManifest(
      manifest,
      /** @type {any} */ ({ kind: "write" }),
    )).toThrow(ProjectQueryRequestInvalidError)
  })

  test("reads only the public manifest from a project root", async () => {
    await fs.promises.mkdir(path.resolve(tempRoot, ".minista"), {
      recursive: true,
    })
    await fs.promises.writeFile(
      path.resolve(tempRoot, ".minista/manifest.json"),
      JSON.stringify(manifest),
      "utf8",
    )

    await expect(queryProject(tempRoot, { kind: "inspect" })).resolves
      .toMatchObject({ counts: { routes: 1, pages: 1, outputs: 1 } })
    await expect(queryProject(path.resolve(tempRoot, "missing"), {
      kind: "inspect",
    })).rejects.toBeInstanceOf(ProjectManifestNotFoundError)
  })
})
