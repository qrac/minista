import fs from "node:fs/promises"
import path from "node:path"
import { afterEach, describe, expect, test, vi } from "vitest"
import { ViteDevServerAdapter } from "../../src/adapters/vite/dev-server.js"
import { ViteAppBuilderAdapter } from "../../src/adapters/vite/app-builder.js"
import { attachViteBuildSession, createViteBuildSession } from "../../src/adapters/vite/build-session.js"
import { NodeDiagnosticsWriter } from "../../src/adapters/filesystem/diagnostics-writer.js"
import { runMinista } from "../../src/cli/utils/command.js"

/** @type {string[]} */
const roots = []
/** @param {string} config @param {string} [page] */
async function fixture(config, page = 'export default function Page(){return <h1>first</h1>}') {
  const parent = path.resolve(import.meta.dirname, "../.tmp")
  await fs.mkdir(parent, { recursive: true })
  const root = await fs.mkdtemp(path.join(parent, "application-contract-"))
  roots.push(root)
  await fs.writeFile(path.join(root, "package.json"), JSON.stringify({type:"module"}))
  await fs.mkdir(path.join(root, "src/pages"), { recursive: true })
  await fs.writeFile(path.join(root, "src/pages/index.jsx"), page)
  await fs.writeFile(path.join(root, "vite.config.js"), config)
  return root
}
/** @param {string} root */
async function build(root) {
  return new ViteAppBuilderAdapter().build(attachViteBuildSession({
    root, configFile: path.join(root, "vite.config.js"), logLevel: "silent",
  }, createViteBuildSession()))
}
/** @param {string} root @param {string} file */
async function read(root, file) { return fs.readFile(path.join(root, file), "utf8") }
afterEach(async () => {
  vi.restoreAllMocks()
  await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })))
})

describe("application build contracts", () => {
  test("preserves existing output when emptyOutDir is false", async () => {
    const root = await fixture(`import {pluginSsg} from 'minista'; export default {plugins:[pluginSsg()],build:{emptyOutDir:false}}`)
    await fs.mkdir(path.join(root, "dist"))
    await fs.writeFile(path.join(root, "dist/keep.txt"), "keep")
    await build(root)
    expect(await read(root, "dist/keep.txt")).toBe("keep")
    expect(await read(root, "dist/index.html")).toContain("<h1>first</h1>")
  })

  test("a new build session evaluates the updated render bundle", async () => {
    const root = await fixture(`import {pluginSsg} from 'minista'; export default {plugins:[pluginSsg()]}`)
    await build(root)
    await fs.writeFile(path.join(root, "src/pages/index.jsx"), 'export default function Page(){return <h1>second</h1>}')
    await build(root)
    expect(await read(root, "dist/index.html")).toContain("<h1>second</h1>")
  })

  test("restores output and manifest if metadata fails after the client build", async () => {
    const root = await fixture(`import {pluginSsg} from 'minista'; export default {plugins:[pluginSsg()]}`)
    await build(root)
    const before = await Promise.all([read(root, "dist/index.html"), read(root, ".minista/manifest.json"), read(root, ".minista/diagnostics.json")])
    await fs.writeFile(path.join(root, "src/pages/index.jsx"), 'export default function Page(){return <h1>second</h1>}')
    vi.spyOn(NodeDiagnosticsWriter.prototype, "write").mockRejectedValueOnce(new Error("metadata unavailable"))
    await expect(build(root)).rejects.toThrow("metadata unavailable")
    expect(await Promise.all([read(root, "dist/index.html"), read(root, ".minista/manifest.json"), read(root, ".minista/diagnostics.json")])).toEqual(before)
  })

  test("runs application pre/post hooks and rolls back a failing post hook", async () => {
    const root = await fixture(`import {pluginSsg} from 'minista'; import fs from 'node:fs'; export default {
      plugins:[pluginSsg(),{name:'application-observer',buildApp:{order:'post',handler(builder){
        if(!builder.environments.render.isBuilt || !builder.environments.client.isBuilt) throw Error('incomplete application');
        if(fs.existsSync(builder.config.root+'/fail')) throw Error('post failed');
      }}}]}`)
    await build(root)
    const html = await read(root, "dist/index.html")
    await fs.writeFile(path.join(root, "fail"), "")
    await fs.writeFile(path.join(root, "src/pages/index.jsx"), 'export default function Page(){return <h1>second</h1>}')
    await expect(build(root)).rejects.toThrow("post failed")
    expect(await read(root, "dist/index.html")).toBe(html)
  })

  test("does not let application hooks build the client before preparation", async () => {
    const root = await fixture(`import {pluginSsg} from 'minista'; export default {plugins:[pluginSsg(),{name:'early-build',async buildApp(builder){await builder.build(builder.environments.client)}}]}`)
    await expect(build(root)).rejects.toMatchObject({ code: "MINISTA_VITE_APP_BUILD_RESERVED" })
  })

  test("uses the legacy config path for same-name plugins with different SSR options", async () => {
    const root = await fixture(`import {pluginSsg} from 'minista'; export default ({isSsrBuild})=>({plugins:[pluginSsg(),{
      name:'same-name',transform(code,id){if(id.endsWith('/index.jsx'))return code.replace('__ENV__',isSsrBuild?'server-option':'client-option')}
    }]})`, 'export default function Page(){return <h1>__ENV__</h1>}')
    await expect(build(root)).rejects.toMatchObject({ code: "MINISTA_VITE_APP_CONFIG_LEGACY_ENVIRONMENT" })
    await runMinista(["build", root, "--logLevel", "silent"])
    expect(await read(root, "dist/index.html")).toContain("<h1>server-option</h1>")
    expect(JSON.parse(await read(root, ".minista/diagnostics.json")).diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "MINISTA_VITE_APP_CONFIG_LEGACY_ENVIRONMENT" }),
    ]))
  })

  test("search sees composed document content independent of plugin order", async () => {
    const results = []
    for (const order of ["pluginSearch(),pluginSvg(),pluginComment()", "pluginComment(),pluginSvg(),pluginSearch()"]) {
      const root = await fixture(`import {pluginSsg,pluginSearch,pluginSvg,pluginComment} from 'minista'; export default {plugins:[${order},pluginSsg()]}`,
        'export default function Page(){return <main data-search=""><h1>Visible</h1><svg data-minista-svg="" data-minista-svg-src="/src/label.svg" /></main>}')
      await fs.writeFile(path.join(root, "src/label.svg"), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 20"><text x="0" y="15">reviewvectorword</text></svg>')
      await build(root)
      const files = await fs.readdir(path.join(root, "dist"), { recursive: true })
      const search = files.find((file) => file.endsWith(".json"))
      results.push([await read(root, "dist/index.html"), await read(root, `dist/${search}`)])
    }
    expect(results[0][1]).toContain("reviewvectorword")
    expect(results[0]).toEqual(results[1])
  })
})


test("search exclusions produce identical dev and build JSON", async () => {
  const root = await fixture(`import {pluginSsg,pluginSearch} from 'minista'; export default {plugins:[pluginSsg(),pluginSearch({ignoreSelectors:['.skip']})]}`,
    'export default function Page(){return <main data-search=""><h1 id="intro">Visible</h1><p className="skip">Firsthidden</p><div className="skip"><h2 id="hidden">Secondhidden</h2><p className="skip">Nestedhidden</p></div><h2 id="after">Remaining</h2><p>Body</p></main>}')
  const running = await new ViteDevServerAdapter().start({
    root, configFile: path.join(root, "vite.config.js"), logLevel: "silent",
    server: { host: "127.0.0.1", port: 0, strictPort: true },
  }, { printUrls: false, bindShortcuts: false })
  let devData
  try {
    const address = running.server.httpServer?.address()
    if (!address || typeof address === "string") throw new Error("No dev server address")
    const origin = `http://127.0.0.1:${address.port}`
    // Search UI requests the index after the page has initialized SSG rendering.
    const pageResponse = await fetch(`${origin}/`, { signal: AbortSignal.timeout(10_000) })
    expect(pageResponse.status).toBe(200)
    await pageResponse.text()
    const response = await fetch(`${origin}/@__minista_search_json`, {
      signal: AbortSignal.timeout(10_000),
    })
    expect(response.status).toBe(200)
    devData = await response.json()
  } finally {
    await running.close()
  }
  await build(root)
  const files = await fs.readdir(path.join(root, "dist"), { recursive: true })
  const searchFile = files.find((file) => file.endsWith(".json"))
  expect(searchFile).toBeTruthy()
  /** @type {import("../../src/plugins/search/types.js").SearchData} */
  const buildData = JSON.parse(await read(root, `dist/${searchFile}`))
  expect(devData).toEqual(buildData)
  expect(buildData.words).toEqual(["Body", "Remaining", "Visible"])
  expect(buildData.pages[0].content.map((i) => buildData.words[i])).toEqual(["Visible", "Remaining", "Body"])
  expect(buildData.pages[0].toc).toEqual([[0, "intro"], [1, "after"]])
})
