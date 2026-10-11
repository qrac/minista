import fs from "node:fs/promises"
import path from "node:path"
import { expect, test } from "vitest"
import { NodeHtmlDocumentFactory } from "../../src/adapters/html/index.js"
import { ViteDevServerAdapter } from "../../src/adapters/vite/dev-server.js"
import { createNodeId } from "../../src/core/graph/index.js"
import { pluginImage } from "../../src/plugins/image/index.js"
import { pluginSsg } from "../../src/plugins/ssg/index.js"

test("serves Image and Picture outputs under a configured base", async () => {
  const temp = path.resolve("packages/minista/test/.tmp")
  await fs.mkdir(temp, { recursive: true })
  const root = await fs.mkdtemp(path.join(temp, "image-dev-"))
  let running
  try {
    await fs.mkdir(path.join(root, "src/pages"), { recursive: true })
    await fs.mkdir(path.join(root, "src/assets"), { recursive: true })
    await fs.writeFile(path.join(root, "src/assets/image.svg"),
      '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="4"><path fill="red" d="M0 0h8v4H0z"/></svg>')
    await fs.writeFile(path.join(root, "src/pages/index.jsx"), `
import { Image, Picture } from "minista/assets"
export default () => <>
  <Image src="/src/assets/image.svg" width={4} />
  <Picture src="/src/assets/image.svg" width={4} layout="fixed" formats={["webp", "png"]}
    artDirectives={[{ media: "(max-width: 500px)", src: "/src/assets/image.svg", width: 2 }]} />
</>`)
    running = await new ViteDevServerAdapter().start({
      root, configFile: false, base: "/preview/", logLevel: "silent",
      plugins: [pluginSsg(), pluginImage({
        useCache: false, optimize: { format: "png", breakpoints: [2, 4, 8] },
      })],
      server: { host: "127.0.0.1", port: 0 },
    }, { printUrls: false, bindShortcuts: false })
    const address = running.server.httpServer?.address()
    if (!address || typeof address === "string") throw new Error("Missing port")
    const origin = `http://127.0.0.1:${address.port}`
    const response = await fetch(`${origin}/preview/`)
    expect(response.status).toBe(200)
    const html = await response.text()
    expect(html).not.toContain("data-minista-image")
    expect(html).not.toContain("__minista_image_auto_size")
    const document = new NodeHtmlDocumentFactory().parse({ pageId: createNodeId("page", "test"), html })
    expect(document.select("img")).toHaveLength(2)
    expect(document.select("source").length).toBeGreaterThan(0)
    for (const element of document.select("img, source")) {
      const srcset = element.getAttribute("srcset")
      expect(srcset).toMatch(/^\/preview\/@__minista-image\/.+ (\d+w|\d+x)$/)
      const url = srcset.split(" ")[0]
      if (element.tagName === "img") expect(element.getAttribute("src")).toBe(url)
      expect(Number(element.getAttribute("width"))).toBeGreaterThan(0)
      expect(Number(element.getAttribute("height"))).toBeGreaterThan(0)
      const image = await fetch(`${origin}${url}`)
      expect(image.status).toBe(200)
      expect(image.headers.get("content-type")).toMatch(/^image\/(png|webp)/)
      expect((await image.arrayBuffer()).byteLength).toBeGreaterThan(0)
    }
  } finally {
    await running?.close()
    await fs.rm(root, { recursive: true, force: true })
  }
})
