import fs from "node:fs"
import os from "node:os"
import path from "node:path"

import { afterEach, beforeEach, describe, expect, test } from "vitest"

import {
  NodeSvgSourceResolver,
} from "../../../src/adapters/html/index.js"

let rootDir = ""

beforeEach(async () => {
  rootDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "minista-svg-"))
})

afterEach(async () => {
  await fs.promises.rm(rootDir, { recursive: true, force: true })
})

describe("Node SVG source resolver", () => {
  test("keeps a missing source unresolved", async () => {
    await expect(new NodeSvgSourceResolver(rootDir).resolve("/missing.svg"))
      .resolves.toBeUndefined()
  })

  test("normalizes filesystem read failures", async () => {
    await fs.promises.mkdir(path.resolve(rootDir, "directory.svg"))

    await expect(new NodeSvgSourceResolver(rootDir).resolve("/directory.svg"))
      .rejects.toMatchObject({
        code: "MINISTA_SVG_READ_FAILED",
        operation: "read",
        diagnostic: { location: { file: "directory.svg" } },
      })
  })

  test("reports invalid SVG roots with a project-relative location", async () => {
    await fs.promises.writeFile(
      path.resolve(rootDir, "invalid.svg"),
      "<main>not svg</main>",
    )

    await expect(new NodeSvgSourceResolver(rootDir).resolve("/invalid.svg"))
      .rejects.toMatchObject({
        code: "MINISTA_SVG_PARSE_FAILED",
        operation: "parse",
        diagnostic: {
          severity: "error",
          phase: "compose",
          feature: "feature:svg",
          location: { file: "invalid.svg" },
        },
      })
  })

  test("normalizes SVGO plugin failures", async () => {
    await fs.promises.writeFile(
      path.resolve(rootDir, "icon.svg"),
      '<svg viewBox="0 0 1 1"><path d="M0 0h1v1z"/></svg>',
    )
    const resolver = new NodeSvgSourceResolver(rootDir, /** @type {any} */ ({
      plugins: [{
        name: "fixture-failure",
        fn() {
          throw new Error("SVGO plugin failed")
        },
      }],
    }))

    await expect(resolver.resolve("/icon.svg")).rejects.toMatchObject({
      code: "MINISTA_SVG_OPTIMIZE_FAILED",
      operation: "optimize",
      diagnostic: { location: { file: "icon.svg" } },
    })
  })
})
