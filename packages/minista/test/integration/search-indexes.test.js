import fs from "node:fs/promises"
import path from "node:path"
import { afterEach, expect, test, vi } from "vitest"
import { ViteDevServerAdapter } from "../../src/adapters/vite/dev-server.js"
import { ViteAppBuilderAdapter } from "../../src/adapters/vite/app-builder.js"
import { attachViteBuildSession, createViteBuildSession, getViteBuildSession } from "../../src/adapters/vite/build-session.js"
import { runMinista } from "../../src/cli/utils/command.js"

/** @type {string[]} */
const roots = []
/** @param {string} root @param {string} file */
const read = (root, file) => fs.readFile(path.join(root, file), "utf8")

/** @param {{legacy?: boolean, search?: string, props?: string}} [options] */
async function fixture({ legacy = false, search, props = 'index="en"' } = {}) {
  const parent = path.resolve(import.meta.dirname, "../.tmp")
  await fs.mkdir(parent, { recursive: true })
  const root = await fs.mkdtemp(path.join(parent, "search-indexes-"))
  roots.push(root)
  await fs.mkdir(path.join(root, "src/pages/ja"), { recursive: true })
  await fs.writeFile(path.join(root, "package.json"), '{"type":"module"}')
  await fs.writeFile(path.join(root, "vite.config.js"), `
    import { pluginSsg, pluginSearch, pluginIsland } from 'minista'
    import react from '@vitejs/plugin-react'
    export default ${legacy ? '({isSsrBuild}) =>' : ''} ({
      ${legacy ? "define: { __SSR__: JSON.stringify(isSsrBuild) }," : ''}
      base: '/site/',
      plugins: [pluginSsg(), pluginIsland(), pluginSearch(${search ?? `{
        ignoreSelectors: ['.skip'], inputAttr: 'data-find-input', relativeAttr: 'data-find-relative',
        indexes: {
          en: { ignore: ['ja/**', '404.html'] },
          ja: { src: ['ja/**/*.html'], ignore: ['ja/404.html'], outName: 'japanese', inputAttr: 'data-ja-input', relativeAttr: 'data-ja-relative' },
          empty: { src: ['absent/**/*.html'] },
          alsoEmpty: { src: ['absent/**/*.html'] },
        }
      }`}), react()],
      build: { rolldownOptions: { output: { assetFileNames: 'data/[name]-[hash][extname]' } } }
    })`)
  await fs.writeFile(path.join(root, "src/pages/index.jsx"), `
    import { Search } from 'minista/assets'
    export default function Page() { return <main data-search=""><p>Englishword</p><p className="skip">Hiddenword</p><Search ${props} client:load /></main> }
  `)
  await fs.writeFile(path.join(root, "src/pages/ja/index.jsx"), `
    import { Search } from 'minista/assets'
    export default function Page() { return <main data-search=""><p>日本語 Japaneseword</p><Search index="ja" client:load /></main> }
  `)
  for (const name of ['404', 'ja/404']) {
    await fs.writeFile(path.join(root, `src/pages/${name}.jsx`), 'export default function Page() { return <main data-search="">Errorword</main> }')
  }
  return root
}

/** @param {string} root */
async function build(root) {
  const session = createViteBuildSession()
  await new ViteAppBuilderAdapter().build(attachViteBuildSession({
    root, configFile: path.join(root, "vite.config.js"), logLevel: "silent",
  }, session))
  return session
}

/** @param {string} root */
async function serve(root) {
  const running = await new ViteDevServerAdapter().start({
    root, configFile: path.join(root, "vite.config.js"), logLevel: "silent",
    server: { host: "127.0.0.1", port: 0, strictPort: true },
  }, { printUrls: false, bindShortcuts: false })
  const address = running.server.httpServer?.address()
  if (!address || typeof address === "string") throw new Error("Missing dev address")
  return { running, origin: `http://127.0.0.1:${address.port}/site` }
}

/** @param {string} url */
const request = (url) => fetch(url, { signal: AbortSignal.timeout(10_000) })

afterEach(async () => {
  vi.restoreAllMocks()
  await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })))
})

test.each([false, true])("independent indexes agree in dev and %s legacy build, with hashed references and output claims", async (legacy) => {
  const root = await fixture({ legacy })
  const { running, origin } = await serve(root)
  /** @type {Record<string, any>} */
  const dev = {}
  try {
    expect((await request(`${origin}/`)).status).toBe(200)
    const japanese = await request(`${origin}/ja/`)
    expect(japanese.status).toBe(200)
    expect(await japanese.text()).toContain('data-ja-input=""')
    for (const name of ['en', 'ja', 'empty', 'alsoEmpty']) {
      const response = await request(`${origin}/@__minista_search_json?index=${name}`)
      const body = await response.text()
      expect(response.status, body).toBe(200)
      dev[name] = JSON.parse(body)
    }
    const traces = getViteBuildSession(running.server.config)?.state?.compatibilityTraces
    expect(traces?.filter((event) => event.scope === 'search:dev' && event.phase === 'analyze' && event.type === 'phase:start')).toHaveLength(1)
    if (!legacy) {
      const pagePath = path.join(root, 'src/pages/index.jsx')
      await fs.writeFile(pagePath, (await read(root, 'src/pages/index.jsx')).replace('Englishword', 'Updatedword'))
      await vi.waitFor(async () => {
        // SSG refreshes its RenderedPage snapshot on the browser's page reload.
        const page = await request(`${origin}/`)
        expect(await page.text()).toContain('Updatedword')
        const response = await request(`${origin}/@__minista_search_json?index=en`)
        const data = await response.json()
        expect(data.words).toContain('Updatedword')
        expect(data.words).not.toContain('Englishword')
        dev.en = data
      }, { timeout: 5000, interval: 100 })
    }
    for (const [query, code] of [['', 'MINISTA_SEARCH_INDEX_REQUIRED'], ['?index=missing', 'MINISTA_SEARCH_INDEX_UNKNOWN']]) {
      const response = await request(`${origin}/@__minista_search_json${query}`)
      expect(response.status).toBe(500)
      expect(await response.text()).toContain(code)
    }
  } finally {
    await running.close()
  }
  if (legacy) await runMinista(['build', root, '--logLevel', 'silent'])
  else await build(root)

  const manifest = JSON.parse(await read(root, 'node_modules/.minista/manifest.json'))
  const searchArtifacts = manifest.artifacts.filter((/** @type {any} */ item) => item.owner === 'feature:search')
  expect(searchArtifacts).toHaveLength(4)
  const files = await fs.readdir(path.join(root, 'dist'), { recursive: true })
  const scripts = (await Promise.all(files.filter((file) => file.endsWith('.js')).map((file) => read(root, `dist/${file}`)))).join('\n')
  expect(scripts.includes('/@__minista_search_json')).toBe(false)
  for (const [name, outName, urls] of [['en', 'search-en', ['/']], ['ja', 'japanese', ['/ja/']], ['empty', 'search-empty', []], ['alsoEmpty', 'search-alsoEmpty', []]]) {
    const artifact = searchArtifacts.find((/** @type {any} */ item) => item.id === `artifact:search/${outName}.json`)
    expect(artifact).toBeTruthy()
    expect(artifact.output.fileName).toMatch(new RegExp(`^data/${outName}-[^/]+\\.json$`))
    const data = JSON.parse(await read(root, `dist/${artifact.output.fileName}`))
    expect(data.index).toBe(name)
    expect(data).toEqual(dev[/** @type {string} */ (name)])
    expect(data.pages.map((/** @type {any} */ page) => page.url)).toEqual(urls)
    expect(data.words).not.toContain('Errorword')
    expect(data.words).not.toContain('Hiddenword')
    expect(scripts.includes(artifact.output.fileName)).toBe(true)
    const asset = manifest.assets.find((/** @type {any} */ item) => item.output?.fileName === artifact.output.fileName)
    expect(asset.consumers).toEqual(manifest.pages.filter((/** @type {any} */ page) => urls.includes(page.url)).map((/** @type {any} */ page) => page.id))
  }
  expect(dev.en.words).not.toContain('Japaneseword')
  expect(dev.ja.words).not.toContain('Englishword')
  expect(await read(root, 'dist/index.html')).toContain('data-find-relative="0"')
  expect(await read(root, 'dist/ja/index.html')).toContain('data-ja-relative="1"')
}, 60_000)

test.each([
  ['', 'MINISTA_SEARCH_INDEX_REQUIRED'],
  ['index="missing"', 'MINISTA_SEARCH_INDEX_UNKNOWN'],
])("rejects invalid Search props %s during dev and both build paths", async (props, code) => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  for (const legacy of [false, true]) {
    const root = await fixture({ props, legacy })
    const { running, origin } = await serve(root)
    try {
      const response = await request(`${origin}/`)
      expect(response.status).toBe(500)
      expect(await response.text()).toContain(code)
    } finally {
      await running.close()
    }
    if (legacy) {
      vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('CLI exited') })
      await expect(runMinista(['build', root, '--logLevel', 'silent'])).rejects.toThrow('CLI exited')
      const diagnostics = JSON.parse(await read(root, 'node_modules/.minista/diagnostics.json'))
      expect(diagnostics.diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ code, severity: 'error', feature: 'feature:search' })]))
    } else {
      await expect(build(root)).rejects.toMatchObject({ diagnostics: expect.arrayContaining([expect.objectContaining({ code, severity: 'error', feature: 'feature:search' })]) })
    }
  }
}, 60_000)
