import fs from "node:fs/promises"
import path from "node:path"
import { expect, test } from "vitest"
import { createServer } from "vite"
import { ViteAppBuilderAdapter } from "../../src/adapters/vite/app-builder.js"
import { NodeHtmlDocumentFactory } from "../../src/adapters/html/index.js"
import { createNodeId } from "../../src/core/graph/index.js"

for (const removeImagePreload of [undefined, false, true]) {
  test(`SSG preload in dev and build with real islands: ${removeImagePreload}`, async () => {
    const temp = path.resolve("packages/minista/test/.tmp")
    await fs.mkdir(temp, { recursive: true })
    const root = await fs.mkdtemp(path.join(temp, "ssg-preload-"))
    try {
      await fs.mkdir(path.join(root, "src/pages"), { recursive: true })
      await fs.writeFile(path.join(root, "package.json"), '{"type":"module"}')
      await fs.writeFile(path.join(root, "src/Hero.jsx"), 'export default function Hero(){return <img src="/island.jpg"/>}')
      await fs.writeFile(path.join(root, "src/pages/index.jsx"), `
        import { Head } from "minista/head"
        import Hero from "../Hero.jsx"
        export default function Page(){return <>
          <Head><link rel="preload" as="image" href="/manual.jpg"/></Head>
          <img src="/auto.jpg"/><Hero client:load/><Hero client:only/>
        </>}
      `)
      // Load plugins through the application config, as the CLI does, so the
      // provider and user modules share the native minista/context instance.
      await fs.writeFile(path.join(root, "vite.config.js"), `
        import { pluginSsg, pluginIsland, pluginBeautify } from "minista"
        export default ({ mode }) => ({ plugins: [
          pluginSsg(${JSON.stringify(removeImagePreload === undefined ? {} : { removeImagePreload })}),
          pluginIsland(), ...(mode === "beautify" ? [pluginBeautify({ src: ["**/*.html"] })] : []),
        ] })
      `)
      /** @param {boolean} [beautify] @returns {import("vite").InlineConfig} */
      const config = (beautify = false) => ({ root,
        configFile: path.join(root, "vite.config.js"), logLevel: "silent",
        mode: beautify ? "beautify" : "development",
        server: { host: "127.0.0.1", port: 0 },
      })
      /** @param {string} html */
      const hints = (html) => new NodeHtmlDocumentFactory().parse({
        pageId: createNodeId("page", "preload", "/"), html,
      }).select('link[rel="preload"][as="image"]').map((link) => link.getAttribute("href")).sort()
      const server = await createServer(config())
      let devHtml = ""
      try {
        await server.listen()
        if (!server.resolvedUrls) throw new Error("Dev server has no URL")
        const response = await fetch(server.resolvedUrls.local[0])
        expect(response.status).toBe(200)
        devHtml = await response.text()
      } finally { await server.close() }
      const expected = removeImagePreload === false
        ? ["/auto.jpg", "/island.jpg", "/manual.jpg"] : ["/manual.jpg"]
      expect(hints(devHtml)).toEqual(expected)
      for (const beautify of [false, true]) {
        await new ViteAppBuilderAdapter().build(config(beautify))
        const html = await fs.readFile(path.join(root, "dist/index.html"), "utf8")
        expect(hints(html)).toEqual(expected)
        expect(html).toContain('src="/island.jpg"')
      }
    } finally { await fs.rm(root, { recursive: true, force: true }) }
  }, 60000)
}
