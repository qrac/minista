import fs from "node:fs/promises"
import path from "node:path"
import { expect, test } from "vitest"
import { ViteDevServerAdapter } from "../../src/adapters/vite/dev-server.js"
import { pluginSsg } from "../../src/plugins/ssg/index.js"

test("serves render-imported CSS under a configured base", async () => {
  const temp = path.resolve("packages/minista/test/.tmp")
  await fs.mkdir(temp, { recursive: true })
  const root = await fs.mkdtemp(path.join(temp, "dev-styles-"))
  let running
  try {
    await fs.mkdir(path.join(root, "src/pages"), { recursive: true })
    await fs.writeFile(path.join(root, "src/pages/index.jsx"),
      'import { createElement } from "react"; import styles from "./style.module.css"; export default () => createElement("p", { className: styles.label }, "Styled")')
    await fs.writeFile(path.join(root, "src/pages/style.module.css"),
      '.label { color: rgb(1, 2, 3); }')
    running = await new ViteDevServerAdapter().start({
      root, configFile: false, base: "/preview/", logLevel: "silent",
      plugins: [pluginSsg()],
      server: { host: "127.0.0.1", port: 0 },
    }, { printUrls: false, bindShortcuts: false })
    const address = running.server.httpServer?.address()
    if (!address || typeof address === "string") throw new Error("Missing port")
    const origin = `http://127.0.0.1:${address.port}`
    const response = await fetch(`${origin}/preview/`)
    expect(response.status).toBe(200)
    const html = await response.text()
    const href = html.match(/href="([^"]+\?direct)"/)?.[1]
    expect(href).toBe("/preview/src/pages/style.module.css?direct")
    const css = await fetch(`${origin}${href}`)
    expect(css.status).toBe(200)
    expect(css.headers.get("content-type")).toContain("text/css")
    const className = html.match(/class="([^"]+)"/)?.[1]
    expect(className).toBeTruthy()
    expect(await css.text()).toContain(`.${className}`)
  } finally {
    await running?.close()
    await fs.rm(root, { recursive: true, force: true })
  }
})
