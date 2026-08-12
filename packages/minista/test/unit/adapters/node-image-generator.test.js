import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { afterAll, beforeAll, describe, expect, test } from "vitest"

import { NodeImageGenerator } from "../../../src/adapters/image/index.js"
import { createNodeId } from "../../../src/core/index.js"

const here = path.dirname(fileURLToPath(import.meta.url))
const fixtureDir = path.resolve(here, "../../fixtures/compat-basic")
let cacheDir = ""

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
})
