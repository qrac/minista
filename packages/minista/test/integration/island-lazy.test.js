import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { expect, test } from "vitest"
import { ViteAppBuilderAdapter } from "../../src/adapters/vite/app-builder.js"

import { attachViteBuildSession, createViteBuildSession } from "../../src/adapters/vite/build-session.js"

const fixtures = fileURLToPath(new URL("../fixtures/", import.meta.url))

test.each([true, false])("Island conditional output and claims (useSplitPages: %s)", async (useSplitPages) => {
  const directory = path.resolve(fixtures, "../.tmp")
  await fs.mkdir(directory, { recursive: true })
  const root = await fs.mkdtemp(path.join(directory, "island-lazy-"))
  try {
    await fs.cp(path.join(fixtures, "island-lazy"), root, { recursive: true, filter: (src) => !src.includes("node_modules") })
    const configFile = path.join(root, "vite.config.js")
    await fs.writeFile(configFile, (await fs.readFile(configFile, "utf8")).replace("pluginIsland()", `pluginIsland({ useSplitPages: ${useSplitPages} })`))
    const result = await new ViteAppBuilderAdapter().build(attachViteBuildSession({ root, configFile: path.join(root, "vite.config.js"), logLevel: "silent" }, createViteBuildSession()))
    const files = result.outputManifest.files
    expect(files.filter((file) => /island-\d+-.*\.js$/.test(file.fileName))).toHaveLength(useSplitPages ? 2 : 1)
    const entry = files.find((file) => file.fileName.includes("island-1-"))
    if (!entry) throw new Error("Missing Island entry")
    expect(entry.dynamicImports?.length).toBeGreaterThan(0)
    expect(entry?.imports ?? []).not.toEqual(expect.arrayContaining([expect.stringContaining("snippet-")]))
    const html = await fs.readFile(path.join(root, "dist/index.html"), "utf8")
    expect(html).not.toMatch(/(?:src|href)="[^"]*(?:snippet-|renderer-)/)
    expect(await fs.readFile(path.join(root, "dist/none.html"), "utf8")).not.toContain("island-1-")
    const manifest = JSON.parse(await fs.readFile(path.join(root, "node_modules/.minista/manifest.json"), "utf8"))
    for (const file of files.filter((file) => /(?:snippet-|renderer-|react-)/.test(file.fileName))) {
      expect(manifest.artifacts).toEqual(expect.arrayContaining([expect.objectContaining({ owner: "feature:island", output: expect.objectContaining({ fileName: file.fileName }) })]))
    }
    const source = await fs.readFile(path.join(root, "dist", entry.fileName), "utf8")
    expect(source).toContain("import(")
    expect(files.some((file) => file.fileName.includes("snippet-") && file.fileName.endsWith(".css"))).toBe(true)
  } finally {
    await fs.rm(root, { recursive: true, force: true })
  }
}, 60_000)
