import fs from "node:fs/promises"
import path from "node:path"
import { createHash } from "node:crypto"
import { fileURLToPath } from "node:url"
import { expect, test } from "vitest"
import { pluginSsg, pluginPwa, pluginBeautify } from "../../src/node.js"
import { ViteAppBuilderAdapter } from "../../src/adapters/vite/app-builder.js"
import { attachViteBuildSession } from "../../src/adapters/vite/build-session.js"

const fixtures = fileURLToPath(new URL("../fixtures/", import.meta.url))
test.each(["/", "/offline/"])("precache contains final SSG HTML and PWA paths for base %s", async (base) => {
  const root = await fs.mkdtemp(path.join(fixtures, "pwa-"))
  try {
    await fs.mkdir(path.join(root, "src/pages/nested"), { recursive: true })
    await fs.writeFile(path.join(root, "package.json"), '{"type":"module"}')
    for (const file of ["index.jsx", "nested/index.jsx"]) {
      await fs.writeFile(path.join(root, "src/pages", file), 'export default function Page(){return <html><head><title>Offline</title></head><body>Commands</body></html>}')
    }
    // The feature scheduler must work even with the bridge before SSG/Beautify.
    const result = await new ViteAppBuilderAdapter().build(attachViteBuildSession({
      root, configFile: false, base, logLevel: "silent",
      plugins: [pluginPwa({ injectRegister: "script", workbox: { globPatterns: ["**/*.html"] } }), pluginBeautify({ src: ["**/*.html"] }), pluginSsg()],
    }))
    const sw = await fs.readFile(path.join(root, "dist/sw.js"), "utf8")
    for (const file of ["index.html", "nested/index.html"]) {
      const html = await fs.readFile(path.join(root, "dist", file), "utf8")
      expect(html).toContain(`href="${base}manifest.webmanifest"`)
      expect(html).toContain(`src="${base}registerSW.js"`)
      expect(sw).toContain(file)
      expect(sw).toContain(createHash("md5").update(html).digest("hex"))
    }
    expect(result.outputManifest.files.some(file => file.fileName === "sw.js")).toBe(true)
    await expect(fs.access(path.join(root, "node_modules/.minista/ssr/registerSW.js"))).rejects.toThrow()
  } finally {
    await fs.rm(root, { recursive: true, force: true })
  }
}, 60_000)
