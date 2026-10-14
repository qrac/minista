import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { promisify } from "node:util"
import { execFile } from "node:child_process"
import { expect, test } from "vitest"
import { parse } from "node-html-parser"
import { ViteDevServerAdapter } from "../../src/adapters/vite/dev-server.js"

const fixture = fileURLToPath(new URL("../fixtures/island-tsconfig/", import.meta.url))
const cli = fileURLToPath(new URL("../../bin/minista.js", import.meta.url))
const temporary = fileURLToPath(new URL("../.tmp/", import.meta.url))
const run = promisify(execFile)
const buildOptions = { env: { ...process.env, NODE_ENV: "production" } }

async function copyFixture() {
  await fs.mkdir(temporary, { recursive: true })
  const root = await fs.mkdtemp(path.join(temporary, "island-tsconfig-"))
  await fs.cp(fixture, root, { recursive: true })
  return root
}

// All three paths must carry the importer through their existing snippet handoff.
test.each(["app", "legacy", "external"])("tsconfig Island imports in %s build", async (mode) => {
  const root = await copyFixture()
  try {
    if (mode === "legacy") {
      const configFile = path.join(root, "vite.config.js")
      const code = await fs.readFile(configFile, "utf8")
      await fs.writeFile(configFile, code
        .replace("defineConfig({", "defineConfig(({ isSsrBuild }) => ({")
        .replace("plugins: [", "build: { minify: !isSsrBuild },\n  plugins: [")
        .replace(/\}\)\s*$/, "}))"))
    }
    await run(process.execPath, [cli, "build", root, ...(mode === "external" ? ["--minify", "false"] : [])], buildOptions)
    const html = await fs.readFile(path.join(root, "dist/index.html"), "utf8")
    expect(parse(html).querySelector("button")?.textContent).toBe("Count: 3")
    expect(html).toMatch(/assets\/island-1-.*\.js/)
    const assets = await fs.readdir(path.join(root, "dist/assets"))
    const snippet = assets.find((name) => /^snippet-1-.*\.js$/.test(name))
    if (!snippet) throw new Error("Missing Island component chunk")
    const code = await fs.readFile(path.join(root, "dist/assets", snippet), "utf8")
    expect(code).toContain("useState")
    expect(code).not.toContain("minista:island-import:")
  } finally {
    await fs.rm(root, { recursive: true, force: true })
  }
}, 60_000)

test("dev resolves generated Island imports from the original page", async () => {
  const root = await copyFixture()
  let running
  try {
    running = await new ViteDevServerAdapter().start({ root, logLevel: "silent", server: { host: "127.0.0.1", port: 0 } }, { printUrls: false, bindShortcuts: false })
    const address = running.server.httpServer?.address()
    if (!address || typeof address === "string") throw new Error("Missing dev server address")
    const html = await (await fetch(`http://127.0.0.1:${address.port}/`)).text()
    expect(parse(html).querySelector("button")?.textContent).toBe("Count: 3")
    const result = await running.server.transformRequest("/@__minista-island/snippets/snippet-1.tsx")
    if (!result) throw new Error("Missing transformed Island snippet")
    expect(result.code).toContain("/src/components/Counter.tsx")
    expect(result.code).not.toContain("minista:island-import:")
  } finally {
    await running?.close()
    await fs.rm(root, { recursive: true, force: true })
  }
}, 60_000)

test("the same Island alias follows each page's nearest tsconfig", async () => {
  const root = await copyFixture()
  try {
    const nested = path.join(root, "src/pages/nested")
    await fs.mkdir(nested)
    await fs.copyFile(path.join(root, "src/pages/index.tsx"), path.join(nested, "index.tsx"))
    await fs.writeFile(path.join(nested, "tsconfig.json"), JSON.stringify({
      compilerOptions: { jsx: "react-jsx", paths: { "@/*": ["../../alternate/*"] } },
      include: ["*.tsx"],
    }))
    await fs.mkdir(path.join(root, "src/alternate/components"), { recursive: true })
    await fs.writeFile(path.join(root, "src/alternate/components/Counter.tsx"),
      'export default function Counter({initialCount}) { return <button>Nested counter: {initialCount}</button> }')
    await run(process.execPath, [cli, "build", root], buildOptions)
    const main = await fs.readFile(path.join(root, "dist/index.html"), "utf8")
    const nestedHtml = await fs.readFile(path.join(root, "dist/nested/index.html"), "utf8")
    expect(parse(main).querySelector("button")?.textContent).toBe("Count: 3")
    expect(parse(nestedHtml).querySelector("button")?.textContent).toBe("Nested counter: 3")
    const assets = path.join(root, "dist/assets")
    const sources = await Promise.all((await fs.readdir(assets)).filter((name) => /^snippet-.*\.js$/.test(name)).map((name) => fs.readFile(path.join(assets, name), "utf8")))
    expect(sources).toHaveLength(2)
    expect(sources.some((code) => code.includes("Nested counter:"))).toBe(true)
    expect(sources.some((code) => code.includes("useState"))).toBe(true)
  } finally {
    await fs.rm(root, { recursive: true, force: true })
  }
}, 60_000)

test("Island imports use the client resolver and retain its original importer", async () => {
  const root = await copyFixture()
  try {
    await fs.writeFile(path.join(root, "src/components/ClientCounter.tsx"),
      'export default function Counter({initialCount}) { return <button>Client resolver: {initialCount}</button> }')
    await fs.writeFile(path.join(root, "vite.config.js"), `
import { defineConfig, pluginIsland, pluginSsg } from "minista"
import { fileURLToPath } from "node:url"
export default defineConfig({
  plugins: [pluginSsg(), pluginIsland(), {
    name: "client-counter",
    enforce: "pre",
    applyToEnvironment(environment) { return environment.config.consumer === "client" },
    resolveId(source, importer) {
      if (source !== "@/components/Counter") return null
      if (!importer?.endsWith("/src/pages/index.tsx")) throw new Error("Lost original Island importer")
      return fileURLToPath(new URL("./src/components/ClientCounter.tsx", import.meta.url))
    },
  }],
  resolve: { tsconfigPaths: true },
})
`)
    await run(process.execPath, [cli, "build", root], buildOptions)
    const html = await fs.readFile(path.join(root, "dist/index.html"), "utf8")
    expect(parse(html).querySelector("button")?.textContent).toBe("Count: 3")
    const assets = path.join(root, "dist/assets")
    const name = (await fs.readdir(assets)).find((name) => /^snippet-1-.*\.js$/.test(name))
    if (!name) throw new Error("Missing Island component chunk")
    expect(await fs.readFile(path.join(assets, name), "utf8")).toContain("Client resolver:")
  } finally {
    await fs.rm(root, { recursive: true, force: true })
  }
}, 60_000)
