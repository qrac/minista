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
  test("reports a missing source", async () => {
    await expect(new NodeSvgSourceResolver(rootDir).resolve("/missing.svg"))
      .rejects.toMatchObject({ code: "MINISTA_SVG_SOURCE_NOT_FOUND", diagnostic: { location: { file: "missing.svg" } } })
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

test("preserves rendering attributes, filters metadata and invalidates aliases", async () => {
  const file = path.join(rootDir, "icon.svg")
  await fs.promises.writeFile(file, '<svg viewBox="0 0 10 10" fill="none" stroke="currentColor" data-minista-svg="bad" id="source"><path d="M0 0h1"/></svg>')
  const resolver = new NodeSvgSourceResolver(rootDir, { plugins: [] })
  const source = await resolver.resolve("/icon.svg")
  expect(source?.attributes).toEqual({ viewBox: "0 0 10 10", fill: "none", stroke: "currentColor" })
  await fs.promises.writeFile(file, '<svg viewBox="0 0 20 20"/>')
  resolver.invalidate("./icon.svg")
  expect((await resolver.resolve("/icon.svg"))?.viewBox).toBe("0 0 20 20")
  await fs.promises.unlink(file)
  resolver.clear()
  await expect(resolver.resolve("icon.svg")).rejects.toMatchObject({ code: "MINISTA_SVG_SOURCE_NOT_FOUND" })
})

test("namespaces each inline instance without mutating cached sources", async () => {
  await fs.promises.writeFile(path.join(rootDir, "icon.svg"), '<svg viewBox="0 0 10 10" fill="url(#paint)"><defs><linearGradient id="paint"><stop stop-color="red"/></linearGradient><clipPath id="clip"><path d="M0 0h10v10z"/></clipPath></defs><path id="shape" clip-path="url(#clip)" d="M0 0h10v10z"/><use href="#shape"/></svg>')
  const resolver = new NodeSvgSourceResolver(rootDir, { plugins: [] })
  const first = await resolver.resolve("icon.svg", "page:/:0")
  const second = await resolver.resolve("icon.svg", "page:/:1")
  expect(first).not.toEqual(second)
  expect(await resolver.resolve("icon.svg", "page:/:0")).toEqual(first)
  const paint = first?.innerHtml.match(/linearGradient id="([^"]+)"/)?.[1]
  expect(paint).toMatch(/^minista-/)
  expect(first?.attributes?.fill).toBe(`url(#${paint})`)
  expect(first?.innerHtml).not.toContain('href="#shape"')
  expect((await resolver.resolve("icon.svg"))?.attributes?.fill).toBe("url(#paint)")
})
