import path from "node:path"
import { readFile } from "node:fs/promises"
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
  const topLevelConfig = createViteAppConfig({})
  return plugin.transform.call(
    /** @type {any} */ ({
      environment: {
        name: environmentName,
        config: {
          command: "build",
          build: { ssr: environmentName === "render" },
        },
        getTopLevelConfig: () => topLevelConfig,
      },
    }),
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

  test.each([false, true])("shares Search index references between render and client (multi-index: %s)", async (multiIndex) => {
    const plugin = pluginSearch({
      relativeAttr: "data-result-depth",
      inputAttr: "data-query-input",
      ...(multiIndex ? { indexes: { en: {}, ja: {} } } : {}),
    })
    const id = path.resolve(
      here,
      "../../../src/plugins/search/components/search.js",
    )
    const source = await readFile(id, "utf8")

    const render = await transform(plugin, "render", source, id)
    const client = await transform(plugin, "client", source, id)

    expect(render).toContain('const apply = "serve"')
    expect(client).toContain('const apply = "build"')
    for (const output of [render, client]) {
      expect(output).toContain('"relativeAttr":"data-result-depth"')
      expect(output).toContain('"inputAttr":"data-query-input"')
      expect(output).toContain(`"multiIndex":${multiIndex}`)
      expect(output).toContain(multiIndex ? '"filePath":"/@__minista_search_json?index=ja"' : '"filePath":"/@__minista_search_json"')
    }
  })
})
