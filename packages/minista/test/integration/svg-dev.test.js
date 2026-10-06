import fs from "node:fs/promises"
import path from "node:path"
import { expect, test, vi } from "vitest"
import { createServer, build } from "vite"
import { pluginSvg } from "../../src/plugins/svg/index.js"

const markup = '<svg data-minista-svg="" data-minista-svg-src="/icon.svg" stroke="red"></svg>'
/** @param {number} size */
const source = (size) => `<svg viewBox="0 0 ${size} ${size}" fill="none" stroke="currentColor"><path d="M0 0h1"/></svg>`

test("updates watched SVGs, isolates servers and refreshes repeated builds", async () => {
  const temp = path.resolve("packages/minista/test/.tmp")
  await fs.mkdir(temp, { recursive: true })
  const root = await fs.mkdtemp(path.join(temp, "svg-dev-"))
  const roots = [path.join(root, "one"), path.join(root, "two")]
  /** @type {import("vite").ViteDevServer[]} */
  const servers = []
  const plugin = pluginSvg({ config: { plugins: [] } })
  try {
    for (const [index, directory] of roots.entries()) {
      await fs.mkdir(directory)
      await fs.writeFile(path.join(directory, "icon.svg"), source(index + 10))
      await fs.writeFile(path.join(directory, "index.html"), markup)
      const server = await createServer({ root: directory, configFile: false,
        plugins: [plugin], logLevel: "silent", server: { port: 0, host: "127.0.0.1" } })
      servers.push(server)
      await server.listen()
    }
    /** @param {number} index */
    const render = (index) => servers[index].transformIndexHtml("/", markup, undefined)
    expect(await render(0)).toContain('viewBox="0 0 10 10"')
    expect(await render(1)).toContain('viewBox="0 0 11 11"')
    const otherSend = vi.spyOn(servers[1].environments.client.hot, "send")
    const send = vi.spyOn(servers[0].environments.client.hot, "send")
    await fs.writeFile(path.join(roots[0], "icon.svg"), source(20))
    await vi.waitFor(() => expect(send).toHaveBeenCalledWith("minista:full-reload", { paths: ["/"] }), { timeout: 5000, interval: 100 })
    expect(otherSend).not.toHaveBeenCalledWith("minista:full-reload", expect.anything())
    const html = await render(0)
    expect(html).toContain('viewBox="0 0 20 20"')
    expect(html).toContain('fill="none"')
    expect(html).toContain('stroke="red"')
    expect(await render(1)).toContain('viewBox="0 0 11 11"')
    await fs.unlink(path.join(roots[0], "icon.svg"))
    await vi.waitFor(async () => {
      await expect(render(0)).rejects.toThrow(/SVG missing failed/)
    }, { timeout: 5000, interval: 100 })
    await fs.writeFile(path.join(roots[0], "icon.svg"), source(30))
    await vi.waitFor(async () => expect(await render(0)).toContain('viewBox="0 0 30 30"'), { timeout: 5000, interval: 100 })
    /** @type {import("vite").InlineConfig} */
    const config = { root: roots[0], configFile: false, plugins: [plugin], logLevel: "silent" }
    await build(config)
    expect(await fs.readFile(path.join(roots[0], "dist/index.html"), "utf8")).toContain('viewBox="0 0 30 30"')
    await fs.writeFile(path.join(roots[0], "icon.svg"), source(40))
    await build(config)
    expect(await fs.readFile(path.join(roots[0], "dist/index.html"), "utf8")).toContain('viewBox="0 0 40 40"')
  } finally {
    await Promise.all(servers.map((server) => server.close()))
    await fs.rm(root, { recursive: true, force: true })
  }
}, 30000)


test("inline ID instances match between dev and build", async () => {
  const temp = path.resolve("packages/minista/test/.tmp")
  await fs.mkdir(temp, { recursive: true })
  const root = await fs.mkdtemp(path.join(temp, "svg-ids-"))
  const html = markup + markup
  /** @type {import("vite").InlineConfig} */
  const config = { root, configFile: false, plugins: [pluginSvg()], logLevel: /** @type {const} */ ("silent") }
  let server
  try {
    await fs.writeFile(path.join(root, "index.html"), html)
    await fs.writeFile(path.join(root, "icon.svg"), '<svg viewBox="0 0 10 10"><defs><linearGradient id="a"><stop stop-color="red"/><stop offset="1" stop-color="blue"/></linearGradient></defs><path fill="url(#a)" d="M0 0h10v10H0z"/></svg>')
    server = await createServer(config)
    const dev = await server.transformIndexHtml("/", html)
    await build(config)
    const built = await fs.readFile(path.join(root, "dist/index.html"), "utf8")
    const ids = (/** @type {string} */ code) => [...code.matchAll(/id="(minista-[^"]+)"/g)].map(match => match[1])
    expect(ids(dev)).toHaveLength(2)
    expect(new Set(ids(dev)).size).toBe(2)
    expect(ids(built)).toEqual(ids(dev))
  } finally {
    await server?.close()
    await fs.rm(root, { recursive: true, force: true })
  }
}, 30000)
