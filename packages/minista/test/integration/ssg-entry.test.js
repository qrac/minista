import fs from "node:fs/promises"
import path from "node:path"
import { afterEach, expect, test } from "vitest"
import { pluginSsg } from "../../src/node.js"
import { ViteAppBuilderAdapter } from "../../src/adapters/vite/app-builder.js"
import { attachViteBuildSession, createViteBuildSession } from "../../src/adapters/vite/build-session.js"
import { ViteDevServerAdapter } from "../../src/adapters/vite/dev-server.js"
import { runMinista } from "../../src/cli/utils/command.js"

/** @type {string[]} */
const roots = []
const page = `export default function Page() { return <html><head>
  <link rel="stylesheet" href="/css/reset.css" />
  <script src="/js/legacy.js" />
  <link rel="stylesheet" href="/src/style.css" />
  <script type="module" src="/src/client.js?v=1#start" />
</head><body><h1>SSG entries</h1></body></html> }`

/** @param {boolean} [legacy] */
async function fixture(legacy = false) {
  const parent = path.resolve(import.meta.dirname, "../.tmp")
  await fs.mkdir(parent, { recursive: true })
  const root = await fs.mkdtemp(path.join(parent, "ssg-entry-"))
  roots.push(root)
  for (const dir of ["src/pages", "public/css", "public/js"]) {
    await fs.mkdir(path.join(root, dir), { recursive: true })
  }
  const config = `{ plugins: [pluginSsg()], build: {
    rolldownOptions: { output: { entryFileNames: 'assets/[name].js', assetFileNames: 'assets/[name][extname]' } }
  } }`
  await Promise.all(Object.entries({
    "package.json": '{"type":"module"}',
    "vite.config.js": `import {pluginSsg} from 'minista'; export default ${legacy ? `({isSsrBuild}) => (${config})` : config}`,
    "src/pages/index.jsx": page,
    "src/style.css": ".entry-style { color: blue }",
    "src/imported.css": ".entry-import { color: green }",
    "src/client.js": 'import "./imported.css"; console.log("entry-client")',
    "public/css/reset.css": "body { margin: 0 }",
    "public/js/legacy.js": 'console.log("public-legacy")',
  }).map(([file, content]) => fs.writeFile(path.join(root, file), content)))
  return root
}
/** @param {string} root @param {string} file */
function read(root, file) { return fs.readFile(path.join(root, file), "utf8") }

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })))
})

test.each(["app", "legacy", "external"])("SSG alone bundles entries alongside public CSS/JS (%s)", async (mode) => {
  const root = await fixture(mode === "legacy")
  await runMinista(["build", root, "--logLevel", "silent", ...(mode === "external" ? ["--minify", "false"] : [])])
  const html = await read(root, "dist/index.html")
  expect(html.match(/href="\/css\/reset.css"/g)).toHaveLength(1)
  expect(html).toContain('src="/js/legacy.js"')
  expect(html).toContain('href="/assets/style.css"')
  expect(html).toContain('href="/assets/client.css"')
  expect(html).toContain('src="/assets/client.js?v=1#start"')
  expect(await read(root, "dist/css/reset.css")).toBe(await read(root, "public/css/reset.css"))
  expect(await read(root, "dist/js/legacy.js")).toBe(await read(root, "public/js/legacy.js"))
  expect(await read(root, "dist/assets/client.js")).toContain("entry-client")
  const manifest = JSON.parse(await read(root, "node_modules/.minista/manifest.json"))
  const outputs = manifest.artifacts.filter((/** @type {{owner: string}} */ a) => a.owner === "feature:entry")
  expect(outputs.map((/** @type {{output?: {fileName: string}}} */ a) => a.output?.fileName)).toEqual(expect.arrayContaining(["assets/client.js", "assets/style.css", "assets/client.css"]))
  expect(outputs.some((/** @type {{source: string}} */ a) => /reset|legacy/.test(a.source))).toBe(false)
}, 60_000)

test("SSG analyzes entries once and isolates reused plugins between builds and roots", async () => {
  const root = await fixture()
  const other = await fixture()
  await fs.writeFile(path.join(other, "src/pages/index.jsx"), 'export default function Page() { return <h1>No entry</h1> }')
  const plugins = [pluginSsg()]
  /** @param {string} target */
  async function build(target) {
    const session = createViteBuildSession()
    await new ViteAppBuilderAdapter().build(attachViteBuildSession({
      root: target, configFile: false, plugins, logLevel: "silent",
    }, session))
    const events = session.state.compatibilityTraces ?? []
    expect(events.filter((event) => event.feature === "feature:entry" && event.phase === "analyze" && event.type === "feature:start")).toHaveLength(1)
    expect(events.some((event) => event.scope === "entry:bundle" && event.phase === "analyze")).toBe(false)
  }
  await build(root)
  expect(await read(root, "dist/index.html")).not.toContain("/src/client.js")
  await build(other)
  expect(await read(other, "dist/index.html")).not.toContain("assets/")
  await fs.writeFile(path.join(root, "src/pages/index.jsx"), 'export default function Page() { return <h1>Removed entry</h1> }')
  await build(root)
  const manifest = JSON.parse(await read(root, "node_modules/.minista/manifest.json"))
  expect(manifest.artifacts.some((/** @type {{owner: string}} */ a) => a.owner === "feature:entry")).toBe(false)
}, 60_000)

test("SSG alone serves source entries and public CSS/JS in dev", async () => {
  const root = await fixture()
  const running = await new ViteDevServerAdapter().start({
    root, configFile: path.join(root, "vite.config.js"), logLevel: "silent",
    server: { host: "127.0.0.1", port: 0, strictPort: true },
  }, { printUrls: false, bindShortcuts: false })
  try {
    const address = running.server.httpServer?.address()
    if (!address || typeof address === "string") throw new Error("No dev server address")
    const origin = `http://127.0.0.1:${address.port}`
    const response = await fetch(origin, { signal: AbortSignal.timeout(10_000) })
    const html = await response.text()
    expect(html).toContain('src="/src/client.js?v=1#start"')
    expect(html).toContain('href="/src/style.css"')
    for (const [url, content] of [["/css/reset.css", "margin: 0"], ["/js/legacy.js", "public-legacy"], ["/src/style.css", "entry-style"], ["/src/client.js?v=1", "entry-client"]]) {
      const asset = await fetch(origin + url, { signal: AbortSignal.timeout(10_000) })
      expect(asset.status).toBe(200)
      expect(await asset.text()).toContain(content)
    }
  } finally {
    await running.close()
  }
}, 60_000)
