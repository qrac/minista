import fs from "node:fs"
import os from "node:os"
import path from "node:path"

import { afterEach, beforeEach, describe, expect, test } from "vitest"

import {
  NodeSpriteBuilder,
  NodeSpriteError,
} from "../../../src/adapters/sprite/index.js"

let rootDir = ""
let sourceDir = ""

beforeEach(async () => {
  rootDir = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), "minista-sprite-"),
  )
  sourceDir = path.resolve(rootDir, "src/icons")
  await fs.promises.mkdir(sourceDir, { recursive: true })
})

afterEach(async () => {
  await fs.promises.rm(rootDir, { recursive: true, force: true })
})

describe("Node sprite builder", () => {
  test("builds symbols in deterministic ID order", async () => {
    await Promise.all([
      fs.promises.writeFile(
        path.resolve(sourceDir, "later.svg"),
        '<svg viewBox="0 0 2 2"><path d="M0 0h2v2z"/></svg>',
      ),
      fs.promises.writeFile(
        path.resolve(sourceDir, "first.svg"),
        '<svg viewBox="0 0 1 1"><path d="M0 0h1v1z"/></svg>',
      ),
    ])

    const sprite = await new NodeSpriteBuilder(rootDir).build("src/icons")

    expect(sprite).toContain('<symbol id="first" viewBox="0 0 1 1">')
    expect(sprite).toContain('<symbol id="later" viewBox="0 0 2 2">')
    expect(sprite.indexOf('id="first"')).toBeLessThan(
      sprite.indexOf('id="later"'),
    )
  })

  test("reports invalid SVG roots with a project-relative location", async () => {
    await fs.promises.writeFile(
      path.resolve(sourceDir, "invalid.svg"),
      "<main>not svg</main>",
    )

    await expect(new NodeSpriteBuilder(rootDir).build("src/icons"))
      .rejects.toMatchObject({
        code: "MINISTA_SPRITE_PARSE_FAILED",
        name: NodeSpriteError.name,
        operation: "parse",
        diagnostic: {
          severity: "error",
          phase: "generate",
          feature: "feature:sprite",
          location: { file: "src/icons/invalid.svg" },
        },
      })
  })

  test("normalizes SVGO plugin failures", async () => {
    await fs.promises.writeFile(
      path.resolve(sourceDir, "icon.svg"),
      '<svg viewBox="0 0 1 1"><path d="M0 0h1v1z"/></svg>',
    )
    const builder = new NodeSpriteBuilder(rootDir, /** @type {any} */ ({
      plugins: [{
        name: "fixture-failure",
        fn() {
          throw new Error("SVGO plugin failed")
        },
      }],
    }))

    await expect(builder.build("src/icons")).rejects.toMatchObject({
      code: "MINISTA_SPRITE_OPTIMIZE_FAILED",
      operation: "optimize",
      diagnostic: { location: { file: "src/icons/icon.svg" } },
    })
  })
})
