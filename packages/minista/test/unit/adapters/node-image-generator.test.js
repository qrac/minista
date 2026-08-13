import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { afterAll, beforeAll, describe, expect, test, vi } from "vitest"

import {
  NodeImageError,
  NodeImageGenerator,
} from "../../../src/adapters/image/index.js"
import { createNodeId } from "../../../src/core/index.js"

const here = path.dirname(fileURLToPath(import.meta.url))
const fixtureDir = path.resolve(here, "../../fixtures/compat-basic")
let cacheDir = ""

/** @param {string} source */
function createReference(source) {
  return {
    key: "page:index:0",
    pageId: createNodeId("page", "index"),
    tagName: /** @type {const} */ ("img"),
    source,
    optimize: {},
    sizes: "__minista_image_auto_size",
    width: "__minista_image_auto_size",
    height: "__minista_image_auto_size",
  }
}

function createOptions() {
  return {
    useCache: false,
    decoding: "async",
    loading: "eager",
    optimize: {
      outName: "[name]-[width]x[height]",
      remoteName: "remote-[index]",
      layout: "constrained",
      breakpoints: [320],
      resolutions: [1, 2],
      format: "png",
      formatOptions: {},
      fit: "cover",
      position: "centre",
    },
  }
}

beforeAll(async () => {
  cacheDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "minista-image-"))
})

afterAll(async () => {
  await fs.promises.rm(cacheDir, { recursive: true, force: true })
})

describe("Node image generator", () => {
  test("generates real image artifacts from domain references", async () => {
    const generator = new NodeImageGenerator(fixtureDir, cacheDir)
    const result = await generator.generate(
      [
        {
          key: "page:index:0",
          pageId: createNodeId("page", "index"),
          tagName: "img",
          source: "/src/assets/pixel.svg",
          optimize: {},
          sizes: "__minista_image_auto_size",
          width: "__minista_image_auto_size",
          height: "__minista_image_auto_size",
        },
      ],
      {
        useCache: false,
        decoding: "async",
        loading: "eager",
        optimize: {
          outName: "[name]-[width]x[height]",
          remoteName: "remote-[index]",
          layout: "constrained",
          breakpoints: [320],
          resolutions: [1, 2],
          format: "png",
          formatOptions: {},
          fit: "cover",
          position: "centre",
        },
      },
    )

    expect(result.artifacts).toHaveLength(1)
    expect(result.artifacts[0]).toMatchObject({
      source: "/src/assets/pixel.svg",
      fileName: "src/assets/pixel-2x2.png",
      mediaType: "image/png",
    })
    expect(result.artifacts[0].content).toBeInstanceOf(Uint8Array)
    expect(result.plans).toMatchObject([
      {
        key: "page:index:0",
        sizes: "(min-width: 2px) 2px, 100vw",
        width: 2,
        height: 2,
      },
    ])
  })

  test("invalidates a cached artifact when source content changes", async () => {
    const rootDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), "minista-image-source-"),
    )
    const sourceFile = path.resolve(rootDir, "pixel.svg")
    const generator = new NodeImageGenerator(rootDir, cacheDir)
    const reference = {
      key: "page:index:0",
      pageId: createNodeId("page", "index"),
      tagName: /** @type {const} */ ("img"),
      source: "/pixel.svg",
      optimize: {},
      sizes: "__minista_image_auto_size",
      width: "__minista_image_auto_size",
      height: "__minista_image_auto_size",
    }
    const options = {
      useCache: true,
      decoding: /** @type {const} */ ("async"),
      loading: /** @type {const} */ ("eager"),
      optimize: {
        outName: "[name]-[width]x[height]",
        remoteName: "remote-[index]",
        layout: /** @type {const} */ ("constrained"),
        breakpoints: [2],
        resolutions: [1],
        format: /** @type {const} */ ("png"),
        formatOptions: {},
        fit: /** @type {const} */ ("cover"),
        position: "centre",
      },
    }

    try {
      await fs.promises.writeFile(
        sourceFile,
        '<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><path fill="#000" d="M0 0h2v2H0z"/></svg>',
      )
      await generator.generate([reference], options)
      const beforeManifest = JSON.parse(
        await fs.promises.readFile(path.resolve(cacheDir, "cache.json"), "utf8"),
      )
      await fs.promises.writeFile(
        sourceFile,
        '<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><path fill="#fff" d="M0 0h2v2H0z"/></svg>',
      )
      await generator.generate([reference], options)
      const afterManifest = JSON.parse(
        await fs.promises.readFile(path.resolve(cacheDir, "cache.json"), "utf8"),
      )

      expect(afterManifest.artifacts["pixel-2x2.png"]).not.toBe(
        beforeManifest.artifacts["pixel-2x2.png"],
      )
    } finally {
      await fs.promises.rm(rootDir, { recursive: true, force: true })
    }
  })

  test("reports a missing local source with a project-relative location", async () => {
    const generator = new NodeImageGenerator(fixtureDir, cacheDir)

    await expect(generator.generate(
      [createReference("/src/assets/missing.png")],
      /** @type {any} */ (createOptions()),
    )).rejects.toMatchObject({
      code: "MINISTA_IMAGE_READ_FAILED",
      name: NodeImageError.name,
      operation: "read",
      diagnostic: {
        code: "MINISTA_IMAGE_READ_FAILED",
        severity: "error",
        phase: "generate",
        feature: "feature:image",
        location: { file: "src/assets/missing.png" },
      },
    })
  })

  test("normalizes Sharp metadata failures", async () => {
    const rootDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), "minista-image-invalid-"),
    )
    try {
      await fs.promises.writeFile(
        path.resolve(rootDir, "invalid.png"),
        "not an image",
      )
      const generator = new NodeImageGenerator(rootDir, cacheDir)

      await expect(generator.generate(
        [createReference("/invalid.png")],
        /** @type {any} */ (createOptions()),
      )).rejects.toMatchObject({
        code: "MINISTA_IMAGE_METADATA_FAILED",
        operation: "metadata",
        diagnostic: {
          location: { file: "invalid.png" },
        },
      })
    } finally {
      await fs.promises.rm(rootDir, { recursive: true, force: true })
    }
  })

  test("normalizes Sharp transformation failures", async () => {
    const generator = new NodeImageGenerator(fixtureDir, cacheDir)
    const reference = {
      ...createReference("/src/assets/pixel.svg"),
      optimize: { format: "invalid" },
    }

    await expect(generator.generate(
      [reference],
      /** @type {any} */ (createOptions()),
    )).rejects.toMatchObject({
      code: "MINISTA_IMAGE_TRANSFORM_FAILED",
      operation: "transform",
      diagnostic: {
        phase: "generate",
        location: { file: "src/assets/pixel.svg" },
      },
    })
  })

  test("normalizes remote failures without exposing URL query data", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, {
      status: 404,
      statusText: "Not Found",
    })))
    const source = "https://images.example.test/photo.png?token=secret"
    const generator = new NodeImageGenerator(fixtureDir, cacheDir)
    try {
      await generator.generate(
        [createReference(source)],
        /** @type {any} */ (createOptions()),
      )
      throw new Error("Expected remote image generation to fail.")
    } catch (error) {
      if (!error || typeof error !== "object") throw error
      expect(error).toMatchObject({
        code: "MINISTA_IMAGE_DOWNLOAD_FAILED",
        operation: "download",
        diagnostic: {
          message: expect.stringContaining(
            "https://images.example.test/photo.png",
          ),
        },
      })
      expect(Reflect.get(error, "diagnostic").message).not.toContain("secret")
      expect(Reflect.get(error, "diagnostic")).not.toHaveProperty("location")
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
