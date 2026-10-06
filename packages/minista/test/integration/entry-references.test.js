import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { expect, test } from "vitest"
import { ViteAppBuilderAdapter } from "../../src/adapters/vite/app-builder.js"
import { attachViteBuildSession, createViteBuildSession } from "../../src/adapters/vite/build-session.js"
import { NodeHtmlDocumentFactory } from "../../src/adapters/html/index.js"
import { createNodeId } from "../../src/core/graph/index.js"

const fixtures = fileURLToPath(new URL("../fixtures/", import.meta.url))

test.each(["", "/", "/base/", "./", "https://cdn.example.test/base/"])("Entry references and combined feature claims (base %s)", async (base) => {
  const directory = path.resolve(fixtures, "../.tmp")
  await fs.mkdir(directory, { recursive: true })
  const root = await fs.mkdtemp(path.join(directory, "entry-references-"))
  try {
    for (const file of ["package.json", "vite.config.js", "src"]) {
      await fs.cp(path.join(fixtures, "compat-basic", file), path.join(root, file), { recursive: true })
    }
    await fs.mkdir(path.join(root, "public"))
    await fs.writeFile(path.join(root, "public/public.svg"), '<svg xmlns="http://www.w3.org/2000/svg"/>')
    await fs.writeFile(path.join(root, "src/assets/shared.css"), '.entry-shared { color: red }')
    await fs.writeFile(path.join(root, "src/assets/first.js"), 'import "./shared.css"; console.log("first")')
    await fs.writeFile(path.join(root, "src/assets/second.js"), 'import "./shared.css"; console.log("second")')
    const page = path.join(root, "src/pages/index.jsx")
    await fs.writeFile(page, (await fs.readFile(page, "utf8")).replace('<title>', '<script type="module" src="/src/assets/first.js?version=1#start"/><script type="module" src="/src/assets/second.js"/><meta name="unchanged" content="/src/assets/client.js"/><title>').replace('<main data-search>', '<main data-search><a href="/src/assets/client.js">Source link</a><video poster="/src/assets/pixel.svg"/><img src="/public.svg"/><img src="//cdn.example.test/public.svg"/><img srcSet="/src/assets/pixel.svg 1x, /public.svg 2x"/>'))
    await fs.mkdir(path.join(root, "src/pages/nest"))
    await fs.writeFile(path.join(root, "src/pages/nest/none.jsx"), 'export default function Page() { return <p>No entry</p> }')
    await fs.writeFile(path.join(root, "src/pages/nest/used.jsx"), (await fs.readFile(page, "utf8")).replaceAll('"../', '"../../'))
    const result = await new ViteAppBuilderAdapter().build(attachViteBuildSession({ root, base, configFile: path.join(root, "vite.config.js"), logLevel: "silent" }, createViteBuildSession()))
    const manifest = JSON.parse(await fs.readFile(path.join(root, "node_modules/.minista/manifest.json"), "utf8"))
    const prefix = (base === "./" || base === "") ? "" : base
    const html = await fs.readFile(path.join(root, "dist/index.html"), "utf8")
    expect(html).toContain(`src="${prefix}scripts/first.js?version=1#start"`)
    expect(html).toContain('content="/src/assets/client.js"')
    expect(html).toContain('href="/src/assets/client.js"')
    expect(html).toContain('poster="/src/assets/pixel.svg"')
    expect(html).toContain('src="/public.svg"')
    expect(html).toContain('src="//cdn.example.test/public.svg"')
    expect(html).toContain(`${prefix}assets/pixel.svg 1x, /public.svg 2x`)
    const nested = await fs.readFile(path.join(root, "dist/nest/used.html"), "utf8")
    expect(nested).toContain(`src="${(base === "./" || base === "") ? "../" : base}scripts/first.js?version=1#start"`)
    const document = new NodeHtmlDocumentFactory().parse({ pageId: createNodeId("page", "test"), html })
    const styles = document.select('link[rel="stylesheet"]').map((el) => el.getAttribute("href"))
    expect(styles).toContain(`${prefix}assets/shared.css`)
    expect(styles.length).toBe(new Set(styles).size)
    const none = await fs.readFile(path.join(root, "dist/nest/none.html"), "utf8")
    expect(none).not.toContain("shared.css")
    expect(none).not.toContain("first.js")
    const usedPages = manifest.pages.filter((/** @type {{url: string}} */ p) => p.url !== "/nest/none").map((/** @type {{id: string}} */ p) => p.id).sort()
    const entryOutputs = manifest.artifacts.filter((/** @type {{owner: string, output?: {fileName: string}}} */ a) => a.owner === "feature:entry" && a.output)
    expect(entryOutputs.length).toBeGreaterThan(0)
    for (const artifact of entryOutputs) {
      expect(result.outputManifest.files.some((file) => file.fileName === artifact.output.fileName)).toBe(true)
      const asset = manifest.assets.find((/** @type {{id: string}} */ a) => a.id === createNodeId("asset", "output", artifact.id))
      expect(asset).toBeDefined()
      expect([...asset.consumers].sort()).toEqual(usedPages)
    }
    for (const owner of ["ssg", "image", "sprite", "island"]) expect(manifest.artifacts.some((/** @type {{owner: string, output?: {fileName: string}}} */ a) => a.owner === `feature:${owner}` && a.output)).toBe(true)
    expect(html).not.toContain("data-minista-svg")
  } finally {
    await fs.rm(root, { recursive: true, force: true })
  }
}, 60_000)
