import fs from "node:fs/promises"
import path from "node:path"
import { afterEach, expect, test } from "vitest"

import { ViteAppBuilderAdapter } from "../../src/adapters/vite/app-builder.js"
import { runMinista } from "../../src/cli/utils/command.js"
import { NodeHtmlDocumentFactory } from "../../src/adapters/html/index.js"
import { createNodeId } from "../../src/core/graph/index.js"

/** @type {string[]} */
const roots = []

async function fixture(legacy = false, splitRender = false) {
  const parent = path.resolve(import.meta.dirname, "../.tmp")
  await fs.mkdir(parent, { recursive: true })
  const root = await fs.mkdtemp(path.join(parent, "shared-css-"))
  roots.push(root)
  for (const dir of ["src/pages/nest", "src/components"]) {
    await fs.mkdir(path.join(root, dir), { recursive: true })
  }
  const page = `
    import Card from "../components/Card.jsx"
    import styles from "./page.module.css"
    import "./global.css"
    export default function Page() { return <html><head>
      <script type="module" src="/src/client.js" />
      <script type="module" src="/src/other.js" />
    </head><body><h1 className={styles.heading}>Shared CSS</h1><Card /></body></html> }
  `
  const config = `{
    plugins: [pluginSsg()],
    ${splitRender ? `environments: { render: { build: { rolldownOptions: { output: {
      manualChunks(id) { if (id.includes("/components/Card")) return "shared-card" }
    } } } } },` : ""}
  }`
  await Promise.all(Object.entries({
    "package.json": '{"type":"module"}',
    "vite.config.js": `import { pluginSsg } from "minista"; export default ${legacy ? `({isSsrBuild}) => (${config})` : config}`,
    "src/components/Card.jsx": 'import styles from "./Card.module.css"; export default function Card() { return <div className={styles.card}>Shared component CSS</div> }',
    "src/components/Card.module.css": ".card { color: blue; padding: 20px }",
    "src/client.module.css": ".client { border: 3px solid purple }",
    "src/client.js": 'import styles from "./client.module.css"; globalThis.firstStyle = styles.client; export { default as Card } from "./components/Card.jsx"',
    "src/other.js": 'import styles from "./client.module.css"; globalThis.secondStyle = styles.client',
    "src/pages/index.jsx": page,
    "src/pages/nest/index.jsx": 'export { default } from "../index.jsx"',
    "src/pages/none.jsx": 'export default function Page() { return <h1>No client entry</h1> }',
    "src/pages/page.module.css": ".heading { font-size: 28px }",
    "src/pages/global.css": "body { margin: 10px }",
  }).map(([file, content]) => fs.writeFile(path.join(root, file), content)))
  return root
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })))
})

test.each(["app", "legacy", "external"])("shared client chunk CSS is linked once with ordinary page CSS (%s)", async (mode) => {
  const root = await fixture(mode === "legacy")
  await runMinista(["build", root, "--base", "./", "--logLevel", "silent", ...(mode === "external" ? ["--minify", "false"] : [])])
  for (const file of ["index.html", "nest/index.html"]) {
    const html = await fs.readFile(path.join(root, "dist", file), "utf8")
    const document = new NodeHtmlDocumentFactory().parse({ pageId: createNodeId("page", file), html })
    const links = document.select('link[rel="stylesheet"]').map((element) => {
      const href = element.getAttribute("href")
      if (!href) throw new Error("Stylesheet has no href")
      return href
    })
    expect(links.length).toBe(new Set(links).size)
    const css = (await Promise.all(links.map((url) => fs.readFile(path.resolve(root, "dist", path.dirname(file), url), "utf8")))).join("\n")
    expect(css).toMatch(/padding:\s*20px/)
    expect(css).toMatch(/border:\s*3px solid (?:purple|#800080)/)
    expect(css).toMatch(/font-size:\s*28px/)
    expect(css).toMatch(/margin:\s*10px/)
    expect(html).not.toContain('src="/src/')
  }
  const none = await fs.readFile(path.join(root, "dist/none.html"), "utf8")
  const manifest = JSON.parse(await fs.readFile(path.join(root, "node_modules/.minista/manifest.json"), "utf8"))
  const clientStyles = manifest.artifacts.filter((/** @type {{owner: string, kind: string}} */ artifact) => artifact.owner === "feature:entry" && artifact.kind === "style")
  expect(clientStyles.length).toBeGreaterThan(0)
  for (const artifact of clientStyles) {
    const css = await fs.readFile(path.join(root, "dist", artifact.output.fileName), "utf8")
    if (!/border:\s*3px solid/.test(css)) continue
    expect(none).not.toContain(artifact.output.fileName)
    const asset = manifest.assets.find((/** @type {{id: string}} */ item) => item.id === createNodeId("asset", "output", artifact.id))
    const consumers = manifest.pages.filter((/** @type {{url: string}} */ page) => page.url !== "/none").map((/** @type {{id: string}} */ page) => page.id)
    expect([...asset.consumers].sort()).toEqual(consumers.sort())
  }
}, 60_000)

test("SSG preserves CSS Modules from a separate render chunk", async () => {
  const root = await fixture(false, true)
  await new ViteAppBuilderAdapter().build({ root, configFile: path.join(root, "vite.config.js"), logLevel: "silent" }, {
    prepareClient({ renderOutput }) {
      const output = Array.isArray(renderOutput) ? renderOutput.flatMap((result) => result.output)
        : "output" in renderOutput ? renderOutput.output : []
      expect(output.some((item) => item.type === "chunk" && !item.isEntry && item.viteMetadata?.importedCss.size)).toBe(true)
    },
  })
  const html = await fs.readFile(path.join(root, "dist/index.html"), "utf8")
  const document = new NodeHtmlDocumentFactory().parse({ pageId: createNodeId("page", "/"), html })
  const css = (await Promise.all(document.select('link[rel="stylesheet"]').map((element) => {
    const href = element.getAttribute("href")
    if (!href) throw new Error("Stylesheet has no href")
    return fs.readFile(path.join(root, "dist", href.replace(/^\//, "")), "utf8")
  }))).join("\n")
  const cardClass = document.select("div[class]")[0].getAttribute("class")
  expect(css).toContain(`.${cardClass}`)
  expect(css).toMatch(/padding:\s*20px/)
}, 60_000)
