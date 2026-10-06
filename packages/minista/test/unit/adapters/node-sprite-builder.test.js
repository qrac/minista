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

    const sprite = await new NodeSpriteBuilder(rootDir, {}).build("src/icons")

    expect(sprite).toContain('<symbol id="first" viewBox="0 0 1 1">')
    expect(sprite).toContain('<symbol id="later" viewBox="0 0 2 2">')
    expect(sprite.indexOf('id="first"')).toBeLessThan(
      sprite.indexOf('id="later"'),
    )
  })

  test("optimizes SVG fragments containing sibling elements and text", async () => {
    await fs.promises.writeFile(
      path.resolve(sourceDir, "label.svg"),
      [
        '<svg viewBox="0 0 24 24">',
        '<path d="M4 4h16v16H4z" fill="#eee"/>',
        '<text x="12" y="15" text-anchor="middle">Hi</text>',
        "</svg>",
      ].join(""),
    )

    const sprite = await new NodeSpriteBuilder(rootDir).build("src/icons")

    expect(sprite).toContain('<symbol id="label" viewBox="0 0 24 24">')
    expect(sprite).toContain("<path")
    expect(sprite).toContain(
      '<text x="12" y="15" text-anchor="middle">Hi</text>',
    )
  })

  test("optimizes text content in existing symbol elements", async () => {
    await fs.promises.writeFile(
      path.resolve(sourceDir, "symbols.svg"),
      [
        "<svg>",
        '<symbol id="label" viewBox="0 0 24 24">',
        '<path d="M4 4h16v16H4z"/>',
        "<text>Hi</text>",
        "</symbol>",
        "</svg>",
      ].join(""),
    )

    const sprite = await new NodeSpriteBuilder(rootDir).build("src/icons")

    expect(sprite).toContain('<symbol id="label" viewBox="0 0 24 24">')
    expect(sprite).toContain("<text>Hi</text>")
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

test("reports duplicate public IDs with both source names", async () => {
  await fs.promises.writeFile(path.join(sourceDir, "same.svg"), '<svg viewBox="0 0 10 10"><path d="M0 0h1"/></svg>')
  await fs.promises.writeFile(path.join(sourceDir, "other.svg"), '<svg><symbol id="same" viewBox="0 0 10 10"><path d="M0 0h1"/></symbol></svg>')
  await expect(new NodeSpriteBuilder(rootDir).build("src/icons")).rejects.toMatchObject({
    code: "MINISTA_SPRITE_DUPLICATE_SYMBOL",
    diagnostic: { message: expect.stringMatching(/other.svg.*same.svg/) },
  })
})

test("preserves root paint and shared definitions across public symbols", async () => {
  const code = '<svg fill="none" stroke="red"><defs><linearGradient id="paint"><stop stop-color="red"/></linearGradient></defs><symbol id="one" viewBox="0 0 10 10"><path fill="url(#paint)" d="M0 0h10v10z"/></symbol><symbol id="two" viewBox="0 0 10 10"><use href="#one"/></symbol></svg>'
  await fs.promises.writeFile(path.join(sourceDir, "shared.svg"), code)
  const builder = new NodeSpriteBuilder(rootDir)
  const output = await builder.build("src/icons")
  expect(output).toContain('id="one"')
  expect(output).toContain('href="#one"')
  expect(output).toContain('fill="none"')
  const id = output.match(/linearGradient id="([^"]+)"/)?.[1]
  expect(id).toMatch(/^minista-/)
  expect(output).toContain(`url(#${id})`)
  expect(await builder.build("src/icons")).toBe(output)
})

test("isolates repeated local IDs within different symbols", async () => {
  const symbol = (/** @type {string} */ id, /** @type {string} */ color) => `<symbol id="${id}" viewBox="0 0 10 10"><defs><linearGradient id="paint"><stop stop-color="${color}"/></linearGradient></defs><path fill="url(#paint)" d="M0 0h10v10H0z"/></symbol>`
  await fs.promises.writeFile(path.join(sourceDir, "symbols.svg"), '<svg>' + symbol("red", "red") + symbol("blue", "blue") + '</svg>')
  const output = await new NodeSpriteBuilder(rootDir).build("src/icons")
  const ids = [...output.matchAll(/linearGradient id="([^"]+)"/g)].map(match => match[1])
  expect(ids).toHaveLength(2)
  expect(new Set(ids).size).toBe(2)
  for (const id of ids) expect(output).toContain(`url(#${id})`)
})
