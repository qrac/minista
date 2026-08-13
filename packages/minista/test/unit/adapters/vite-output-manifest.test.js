import { describe, expect, test } from "vitest"

import fs from "node:fs"
import path from "node:path"

import {
  createViteOutputManifest,
  reconcileViteOutputManifest,
} from "../../../src/adapters/vite/output-manifest.js"

describe("Vite output manifest adapter", () => {
  test("removes source data and absolute module paths", () => {
    const manifest = createViteOutputManifest(
      /** @type {any} */ ({
        output: [
          {
            type: "chunk",
            name: "client",
            fileName: "assets/client-abc.js",
            code: "export default 1",
            facadeModuleId: "/private/project/src/client.js",
            isEntry: true,
            isDynamicEntry: false,
            imports: ["assets/shared-def.js"],
            dynamicImports: [],
          },
          {
            type: "asset",
            names: ["index.html"],
            originalFileNames: ["/private/project/index.html"],
            fileName: "index.html",
            source: "<!doctype html>",
          },
        ],
      }),
      { environment: "client", base: "/docs/" },
    )

    expect(manifest).toMatchObject({
      schemaVersion: "1",
      environment: "client",
      files: [
        {
          logicalId: "client",
          fileName: "assets/client-abc.js",
          url: "/docs/assets/client-abc.js",
          isEntry: true,
        },
        {
          logicalId: "index.html",
          fileName: "index.html",
          url: "/docs/index.html",
        },
      ],
    })
    expect(JSON.stringify(manifest)).not.toContain("/private/project")
    expect(JSON.stringify(manifest)).not.toContain("<!doctype html>")
  })

  test("adds finalize files written outside the Rolldown bundle", async () => {
    const outDir = await fs.promises.mkdtemp(
      path.resolve(process.env.TMPDIR || "/tmp", "minista-output-manifest-"),
    )
    try {
      await fs.promises.writeFile(path.resolve(outDir, "dist.zip"), "archive")
      const initial = createViteOutputManifest(
        /** @type {any} */ ({ output: [] }),
        { environment: "client" },
      )
      const manifest = await reconcileViteOutputManifest(initial, { outDir })

      expect(manifest.files).toEqual([
        expect.objectContaining({
          logicalId: "dist.zip",
          kind: "asset",
          fileName: "dist.zip",
          byteSize: 7,
        }),
      ])
    } finally {
      await fs.promises.rm(outDir, { recursive: true, force: true })
    }
  })
})
