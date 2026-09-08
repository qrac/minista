import fs from "node:fs/promises"
import path from "node:path"
import { promisify } from "node:util"
import { execFile } from "node:child_process"
import { afterEach, expect, test } from "vitest"
import { ViteAppBuilderAdapter } from "../../src/adapters/vite/app-builder.js"
import { attachViteBuildSession, createViteBuildSession } from "../../src/adapters/vite/build-session.js"
import { NodeArchiveBuilder } from "../../src/adapters/archive/node.js"

const execute = promisify(execFile)
/** @type {string[]} */
const roots = []
async function fixture() {
  const parent = path.resolve(import.meta.dirname, "../.tmp")
  await fs.mkdir(parent, { recursive: true })
  const root = await fs.mkdtemp(path.join(parent, "archive-build-"))
  roots.push(root)
  await fs.writeFile(path.join(root, "package.json"), '{"type":"module"}')
  await fs.mkdir(path.join(root, "src/pages"), { recursive: true })
  await fs.writeFile(path.join(root, "src/pages/index.jsx"), 'export default function Page(){return <h1>Archive contents</h1>}')
  return root
}
/** @param {string} root @param {string} options */
async function config(root, options) {
  await fs.writeFile(path.join(root, "vite.config.js"), `import {pluginSsg,pluginArchive} from 'minista'; export default {plugins:[pluginSsg(),pluginArchive(${options})],build:{outDir:'output',emptyOutDir:false}}`)
}
/** @param {string} root */
function build(root) {
  return new ViteAppBuilderAdapter().build(attachViteBuildSession({
    root, configFile: path.join(root, "vite.config.js"), logLevel: "silent",
  }, createViteBuildSession()))
}
/** @param {string} file @param {string} format */
async function entries(file, format) {
  const { stdout } = await execute(format === "zip" ? "unzip" : "tar",
    format === "zip" ? ["-Z1", file] : ["-tf", file])
  return stdout.trim().split("\n").filter(Boolean)
}
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })))
})

for (const format of ["zip", "tar"]) {
  test(`${format}: resolves custom outDir and explicit srcDir, excluding all configured archives on rebuild`, async () => {
    const root = await fixture()
    await fs.mkdir(path.join(root, "input[1]"))
    await fs.writeFile(path.join(root, "input[1]/readme.txt"), "explicit source")
    await fs.writeFile(path.join(root, "input[1]/ignore.txt"), "ignored")
    await config(root, `{archives:[{outName:'site',format:'${format}'},{srcDir:'input[1]',outName:'explicit',format:'${format}',ignore:'input[[]1[]]/ignore.txt'}]}`)
    for (let i = 0; i < 2; i++) {
      const result = await build(root)
      expect(result.diagnostics.filter(({ severity }) => severity === "error" || severity === "warning")).toEqual([])
      const explicitFile = path.join(root, `output/explicit.${format}`)
      const { stdout } = await execute(format === "zip" ? "unzip" : "tar",
        format === "zip" ? ["-p", explicitFile]
          : ["-xOf", explicitFile])
      expect(stdout).toBe("explicit source")
      expect(await entries(path.join(root, `output/site.${format}`), format)).toEqual(["output/index.html"])
      expect(await entries(path.join(root, `output/explicit.${format}`), format)).toEqual(["input[1]/readme.txt"])
      expect(result.outputManifest.files.map((file) => file.fileName)).toEqual(expect.arrayContaining([`site.${format}`, `explicit.${format}`]))
      const manifest = await fs.readFile(path.join(root, "node_modules/.minista/manifest.json"), "utf8")
      expect(manifest).toContain(`site.${format}`)
      expect(JSON.parse(manifest).artifacts).toEqual(expect.arrayContaining([
        expect.objectContaining({ kind: "archive", owner: "feature:archive",
          output: expect.objectContaining({ fileName: `site.${format}` }) }),
        expect.objectContaining({ kind: "archive", owner: "feature:archive",
          output: expect.objectContaining({ fileName: `explicit.${format}` }) }),
      ]))
      expect(manifest).not.toContain(root)
    }
  }, 60_000)

  test(`${format}: permits an existing empty source`, async () => {
    const root = await fixture()
    await fs.mkdir(path.join(root, "empty"))
    const content = await new NodeArchiveBuilder(root).build({ srcDir: "empty", outName: "empty", format: /** @type {"zip" | "tar"} */ (format) })
    if (format === "zip") {
      expect(content.length).toBe(22)
    } else {
      await fs.writeFile(path.join(root, "empty.tar"), content)
      expect(await entries(path.join(root, "empty.tar"), format)).toEqual([])
    }
  })
}

test("default plugin uses custom outDir; missing source rolls back output and metadata", async () => {
  const root = await fixture()
  await config(root, "{}")
  await build(root)
  expect(await entries(path.join(root, "output/dist.zip"), "zip")).toEqual(["output/index.html"])
  const files = ["output/index.html", "output/dist.zip", "node_modules/.minista/manifest.json", "node_modules/.minista/diagnostics.json"]
  const before = await Promise.all(files.map((file) => fs.readFile(path.join(root, file))))
  await config(root, "{archives:[{outName:'new'},{srcDir:'missing',outName:'missing',format:'tar'}]}")
  await fs.writeFile(path.join(root, "src/pages/index.jsx"), 'export default function Page(){return <h1>Changed</h1>}')
  await expect(build(root)).rejects.toMatchObject({ cause: { errors: expect.arrayContaining([expect.objectContaining({ diagnostics: expect.arrayContaining([
    expect.objectContaining({ code: "MINISTA_ARCHIVE_SOURCE_NOT_FOUND", severity: "error", phase: "finalize" }),
  ]) })]) } })
  expect(await Promise.all(files.map((file) => fs.readFile(path.join(root, file))))).toEqual(before)
  expect(await fs.readdir(path.join(root, "output"))).toEqual(["dist.zip", "index.html"])
}, 60_000)

test("a regular file is rejected as an archive source", async () => {
  const root = await fixture()
  await expect(new NodeArchiveBuilder(root).build({srcDir:"package.json",outName:"bad"})).rejects.toMatchObject({
    diagnostic: {code:"MINISTA_ARCHIVE_SOURCE_NOT_DIRECTORY",severity:"error"},
  })
})

test("absolute external outDir is archived without absolute entry names", async () => {
  const root = await fixture()
  const external = await fixture()
  const outDir = path.join(external, "published")
  await fs.writeFile(path.join(root, "vite.config.js"), `import {pluginSsg,pluginArchive} from 'minista'; export default {plugins:[pluginSsg(),pluginArchive()],build:{outDir:${JSON.stringify(outDir)},emptyOutDir:false}}`)
  await build(root)
  expect(await entries(path.join(outDir, "dist.zip"), "zip")).toEqual(["published/index.html"])
  const manifest = await fs.readFile(path.join(root, "node_modules/.minista/manifest.json"), "utf8")
  expect(manifest).not.toContain(external)
}, 60_000)
