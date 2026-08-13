import path from "node:path"
import { fileURLToPath } from "node:url"

import { describe, expect, test } from "vitest"

import { createViteAppConfig } from "../../../src/adapters/vite/app-config.js"
import { pluginImage } from "../../../src/plugins/image/index.js"
import { pluginSearch } from "../../../src/plugins/search/index.js"

const here = path.dirname(fileURLToPath(import.meta.url))
/** @type {import("vite").ConfigEnv} */
const configEnvironment = {
  command: "build",
  mode: "production",
  isSsrBuild: false,
  isPreview: false,
}

/**
 * @param {import("vite").Plugin} plugin
 * @param {string} environmentName
 * @param {string} code
 * @param {string} id
 */
async function transform(plugin, environmentName, code, id) {
  if (typeof plugin.transform !== "function") return undefined
  return plugin.transform.call(
    /** @type {any} */ ({ environment: { name: environmentName } }),
    code,
    id,
  )
}

describe("App Build environment source transforms", () => {
  test("applies Image component defaults only to render", async () => {
    const plugin = pluginImage({ decoding: "sync", loading: "lazy" })
    if (typeof plugin.apply !== "function") throw new Error("apply missing")
    expect(plugin.apply(createViteAppConfig({}), configEnvironment)).toBe(true)
    const id = path.resolve(
      here,
      "../../../src/plugins/image/components/image.js",
    )
    const source = [
      'const defaultDecoding = "async"',
      'const defaultLoading = "eager"',
      "const defaultOptimize = {}",
    ].join("\n")

    const render = await transform(plugin, "render", source, id)
    const client = await transform(plugin, "client", source, id)

    expect(render).toContain('const defaultDecoding = "sync"')
    expect(render).toContain('const defaultLoading = "lazy"')
    expect(client).toBeUndefined()
  })

  test("separates Search render attributes from client behavior", async () => {
    const plugin = pluginSearch({
      relativeAttr: "data-result-depth",
      inputAttr: "data-query-input",
    })
    if (typeof plugin.apply !== "function") throw new Error("apply missing")
    expect(plugin.apply(createViteAppConfig({}), configEnvironment)).toBe(true)
    const id = path.resolve(
      here,
      "../../../src/plugins/search/components/search.js",
    )
    const source = [
      'const apply = "serve"',
      'const relativeAttr = "data-search-relative"',
      'const inputAttr = "data-search-input"',
    ].join("\n")

    const render = await transform(plugin, "render", source, id)
    const client = await transform(plugin, "client", source, id)

    expect(render).toContain('const apply = "serve"')
    expect(render).toContain('const relativeAttr = "data-search-relative"')
    expect(render).toContain('const inputAttr = "data-query-input"')
    expect(client).toContain('const apply = "build"')
    expect(client).toContain('const relativeAttr = "data-result-depth"')
    expect(client).toContain('const inputAttr = "data-query-input"')
  })
})
