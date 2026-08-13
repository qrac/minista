import fs from "node:fs"
import os from "node:os"
import path from "node:path"

import { afterAll, beforeAll, describe, expect, test } from "vitest"

import { createViteAppConfig } from "../../../src/adapters/vite/app-config.js"
import { pluginSsg } from "../../../src/plugins/ssg/index.js"

/** @type {string} */
let root

beforeAll(async () => {
  root = await fs.promises.mkdtemp(path.join(os.tmpdir(), "minista-ssg-config-"))
  await fs.promises.writeFile(
    path.resolve(root, "package.json"),
    JSON.stringify({ name: "ssg-config-fixture" }),
  )
})

afterAll(async () => {
  await fs.promises.rm(root, { recursive: true, force: true })
})

describe("SSG App Build environment config", () => {
  test("returns static named environment options without config-time state", async () => {
    const plugin = pluginSsg()
    if (typeof plugin.config !== "function") throw new Error("config missing")
    const config = createViteAppConfig({
      root,
      environments: {
        render: {
          build: {
            rolldownOptions: { external: ["user-render-external"] },
          },
        },
      },
    })
    const result = await plugin.config.call(
      /** @type {any} */ ({}),
      config,
      {
        command: "build",
        mode: "production",
        isSsrBuild: false,
        isPreview: false,
      },
    )

    expect(plugin.configEnvironment).toBeUndefined()
    expect(result?.environments?.render).toMatchObject({
      build: {
        outDir: path.resolve(root, "node_modules/.minista/ssr"),
        rolldownOptions: {
          external: expect.arrayContaining([
            "user-render-external",
            "minista/context",
            "react",
          ]),
          input: {
            "__minista-ssg": path.resolve(
              root,
              "node_modules/.minista/glob/__minista-ssg.js",
            ),
          },
        },
      },
    })
    expect(result?.environments?.client).toMatchObject({
      build: {
        rolldownOptions: {
          input: {
            "__minista-ssg": path.resolve(
              root,
              "node_modules/.minista/through/__minista-ssg.js",
            ),
          },
        },
      },
    })
  })
})
