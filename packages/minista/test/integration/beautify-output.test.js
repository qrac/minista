import { TraceMap, originalPositionFor } from "@jridgewell/trace-mapping"
import fs from "node:fs/promises"
import path from "node:path"
import { afterAll, beforeAll, expect, test } from "vitest"
import { build } from "vite"
import { pluginBeautify } from "../../src/plugins/beautify/index.js"

/** @type {string} */
let root
beforeAll(async () => {
  root = await fs.mkdtemp(path.resolve("node_modules/.beautify-test-"))
  await fs.writeFile(path.join(root, "entry.js"), 'export const value={answer:42};console.log(value);')
})
afterAll(async () => { await fs.rm(root, { recursive: true, force: true }) })

/**
 * @param {import("../../src/plugins/beautify/types.js").UserPluginOptions} [beautify]
 * @param {import("rolldown").OutputOptions} [output]
 */
async function bundle(beautify = {}, output = {}, css = false, minify = false) {
  return /** @type {Promise<import("rolldown").RolldownOutput>} */ (build({
    root, configFile: false, logLevel: "silent",
    plugins: [
      ...(css ? [/** @type {import("vite").Plugin} */ ({ name: "css-fixture", buildStart() {
        this.emitFile({ type: "asset", name: "style.css", source: "body{color:red}" })
      } })] : []),
      pluginBeautify(beautify),
    ],
    build: { write: false, minify, rolldownOptions: {
      input: path.join(root, "entry.js"),
      output: { minify: false, entryFileNames: "[name]-[hash].js", assetFileNames: "[name][extname]", ...output },
    } },
  }))
}

test("formats JS before hashing and preserves references and CSS fixed names", async () => {
  const first = await bundle({ jsOptions: { indent_size: 2 } }, {}, true)
  const second = await bundle({ jsOptions: { indent_size: 8 } }, {}, true)
  const js = first.output.find((file) => file.type === "chunk")
  const changed = second.output.find((file) => file.type === "chunk")
  expect(js?.code).toContain("\n  answer: 42")
  expect(changed?.code).toContain("\n        answer: 42")
  expect(js?.fileName).not.toBe(changed?.fileName)
  const style = first.output.find((file) => file.fileName === "style.css")
  expect(style?.type === "asset" ? style.source : undefined).toContain("color: red")
})

for (const sourcemap of /** @type {const} */ ([true, "inline", "hidden"])) {
  test(`rejects JS sourcemap ${sourcemap}`, async () => {
    await expect(bundle({}, { sourcemap })).rejects.toThrow("cannot preserve sourcemaps")
  })
}
test("allows sourcemaps when JS and CSS are excluded", async () => {
  const result = await bundle({ src: ["**/*.html"] }, { sourcemap: true })
  const js = result.output.find((file) => file.type === "chunk")
  expect(js?.map?.sources.some((source) => source.endsWith("entry.js"))).toBe(true)
  expect(js?.code).toContain("sourceMappingURL=")
  if (!js?.map) throw new Error("Expected a JS sourcemap")
  const offset = js.code.indexOf("console.log")
  expect(offset).toBeGreaterThanOrEqual(0)
  const before = js.code.slice(0, offset).split("\n")
  const position = originalPositionFor(new TraceMap(JSON.stringify(js.map)), {
    line: before.length, column: before.at(-1)?.length ?? 0,
  })
  expect(position.source).toMatch(/entry\.js$/)
  expect(position.line).toBe(1)
  expect(position.column).toBe('export const value={answer:42};'.length)
})
test("rejects hashed CSS and the old preload option explicitly", async () => {
  await expect(bundle({}, { assetFileNames: "[name]-[hash][extname]" }, true))
    .rejects.toThrow("CSS beautification requires a fixed")
  await expect(bundle({ removeImagePreload: false })).rejects.toThrow("moved to pluginSsg")
})

test("rejects post-render minification instead of losing formatting", async () => {
  await expect(bundle({}, { minify: "dce-only" })).rejects.toThrow("runs after renderChunk")
  await expect(bundle({}, { minify: true })).rejects.toThrow("runs after renderChunk")
})

for (const assetFileNames of ["[name]-[hash:8][extname]", () => "style.css"]) {
  test("rejects CSS naming without a verifiable fixed template", async () => {
    await expect(bundle({ src: ["**/*.css"] }, { assetFileNames }, true))
      .rejects.toThrow("CSS beautification requires a fixed")
  })
}
test("rejects CSS sourcemaps when JS is excluded", async () => {
  await expect(bundle({ src: ["**/*.css"] }, { sourcemap: true }, true))
    .rejects.toThrow("CSS beautification cannot preserve sourcemaps")
})
