import assert from "node:assert/strict"
import * as nodeModule from "node:module"
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { readFileSync, appendFileSync } from "node:fs"

const mode = process.argv[2] ?? "import"
const target = { image: "sharp", svg: "svgo", sprite: "svgo", archive: "archiver", beautify: "js-beautify" }[mode]
const heavy = ["sharp", "svgo", "archiver", "js-beautify"]
const root = await mkdtemp(path.join(tmpdir(), "minista-lazy-"))
const trace = path.join(root, "imports.jsonl")
await writeFile(trace, "")
const loads = () => new Set(readFileSync(trace, "utf8").trim().split("\n").filter(Boolean))
if (nodeModule.registerHooks) {
  nodeModule.registerHooks({ resolve(specifier, context, next) {
    if (process.env.FAIL_IMPORT === specifier) throw new Error("Injected dependency initialization failure")
    const result = next(specifier, context)
    if (heavy.includes(specifier)) appendFileSync(trace, `${specifier}\n`)
    return result
  } })
} else {
  nodeModule.register(new URL("./lazy-dependency-loader.js", import.meta.url), { data: { trace, heavy, failure: process.env.FAIL_IMPORT } })
}
const start = performance.now()
const api = await import("../packages/minista/src/node.js")
const imported = performance.now()
assert.equal(loads().size, 0, "package import must not load heavy dependencies")
for (const [name, factory] of Object.entries(api)) {
  if (name.startsWith("plugin")) assert.equal(factory() instanceof Promise, false)
}
assert.equal(loads().size, 0, "plugin construction must remain lazy")
try {
  await mkdir(path.join(root, "icons"))
  await writeFile(path.join(root, "icons/a.svg"), '<svg viewBox="0 0 10 10"><path d="M0 0h10v10z"/></svg>')
  let run = async () => {}
  if (mode === "ssg") {
    const { createServer } = await import("vite")
    const server = await createServer({ root, configFile: false, plugins: [api.pluginSsg()], server: { middlewareMode: true, watch: null, hmr: false } })
    await server.close()
  } else if (mode === "svg") {
    const { NodeSvgSourceResolver } = await import("../packages/minista/src/adapters/html/node-svg-source.js")
    run = () => new NodeSvgSourceResolver(root).resolve("icons/a.svg")
  } else if (mode === "sprite") {
    const { NodeSpriteBuilder } = await import("../packages/minista/src/adapters/sprite/node.js")
    run = () => new NodeSpriteBuilder(root).build("icons")
  } else if (mode === "archive") {
    const { NodeArchiveBuilder } = await import("../packages/minista/src/adapters/archive/node.js")
    run = () => new NodeArchiveBuilder(root).build({ srcDir: "icons", outName: "icons", format: "zip" })
  } else if (mode === "image") {
    const { NodeImageGenerator } = await import("../packages/minista/src/adapters/image/node.js")
    let generation = 0
    run = () => new NodeImageGenerator(root, path.join(root, `cache-${generation++}`)).generate([
      { key: "image:0", pageId: "page:index", tagName: "img", source: "/icons/a.svg", optimize: {}, sizes: "__minista_image_auto_size", width: "__minista_image_auto_size", height: "__minista_image_auto_size" },
    ], { useCache: false, decoding: "async", loading: "eager", optimize: { outName: "[name]-[width]x[height]", remoteName: "remote-[index]", layout: "constrained", breakpoints: [10], resolutions: [1], format: "png", formatOptions: {}, fit: "cover", position: "centre" } })
  } else if (mode === "beautify") {
    const { createOutputFormatter } = await import("../packages/minista/src/features/beautify/format.js")
    const format = createOutputFormatter({ src: ["**/*.html"], htmlOptions: {}, cssOptions: {}, jsOptions: {}, removeImagePreload: false })
    await format({ fileName: "ignored.txt", content: "hello" })
    assert.equal(loads().size, 0)
    run = () => format({ fileName: "index.html", content: "<html><body><p>Hello</p></body></html>" })
  }
  const ready = performance.now()
  if (process.env.FAIL_IMPORT && mode === "beautify") {
    const { createBeautifyFeature } = await import("../packages/minista/src/features/beautify/format.js")
    const { DiagnosticCollector, LifecycleRunner, MemoryEmitter, MemoryArtifactStore, MemoryHtmlDocumentStore, ProjectGraph, createNodeId, toProjectPath } = await import("../packages/minista/src/core/index.js")
    const diagnostics = new DiagnosticCollector()
    const emitter = new MemoryEmitter()
    await emitter.emit({ fileName: "index.html", content: "<p>Hello</p>" })
    const graph = new ProjectGraph({ id: createNodeId("project", "lazy"), name: "lazy", root: toProjectPath(".") }, diagnostics)
    const feature = createBeautifyFeature({ src: ["**/*.html"], htmlOptions: {}, cssOptions: {}, jsOptions: {}, removeImagePreload: false })
    const runner = new LifecycleRunner([{ ...feature, requires: [] }], { graph, diagnostics, emitter, artifacts: new MemoryArtifactStore(), documents: new MemoryHtmlDocumentStore() })
    const result = await runner.run({ phases: ["finalize"] })
    assert.equal(result.ok, false)
    assert.equal(diagnostics.snapshot()[0].code, "MINISTA_PHASE_FAILED")
  } else if (process.env.FAIL_IMPORT) {
    await assert.rejects(run, (error) => {
      assert.match(error.message, /Injected dependency initialization failure/)
      const codes = { image: "MINISTA_IMAGE_METADATA_FAILED", svg: "MINISTA_SVG_OPTIMIZE_FAILED", sprite: "MINISTA_SPRITE_OPTIMIZE_FAILED", archive: "MINISTA_ARCHIVE_FAILED" }
      if (codes[mode]) assert.equal(error.diagnostic.code, codes[mode])
      return true
    })
  } else {
    const first = await Promise.all([run(), run()])
    assert.deepEqual(first[0], first[1])
    const processed = performance.now()
    await run()
    assert.deepEqual([...loads()], target ? [target] : [])
    console.log(JSON.stringify({ mode, importMs: imported - start, startupMs: ready - start, firstConcurrentMs: processed - ready, reuseMs: performance.now() - processed, loaded: [...loads()] }))
  }
} finally {
  await rm(root, { recursive: true, force: true })
}
