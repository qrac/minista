import { describe, expect, test } from "vitest"

import {
  defineConfig,
  pluginArchive,
  pluginBeautify,
  pluginBundle,
  pluginComment,
  pluginEntry,
  pluginImage,
  pluginIsland,
  pluginMdx,
  pluginSearch,
  pluginSprite,
  pluginSsg,
  pluginSvg,
} from "../../src/node.js"

describe("public API compatibility", () => {
  test("exports every documented plugin factory", () => {
    const factories = [
      pluginSsg,
      pluginBundle,
      pluginEntry,
      pluginMdx,
      pluginImage,
      pluginSvg,
      pluginSprite,
      pluginComment,
      pluginIsland,
      pluginSearch,
      pluginBeautify,
      pluginArchive,
    ]

    expect(factories.every((factory) => typeof factory === "function")).toBe(true)
    expect(defineConfig({ plugins: [] })).toEqual({ plugins: [] })
  })

  test("keeps plugin names and the pluginMdx array return", () => {
    expect(pluginSsg().name).toBe("vite-plugin:minista-ssg")
    expect(pluginImage().name).toBe("vite-plugin:minista-image")
    expect(pluginIsland().name).toBe("vite-plugin:minista-island")

    const mdx = pluginMdx()
    expect(Array.isArray(mdx)).toBe(true)
    expect(mdx[0].name).toBe("vite-plugin:minista-mdx")
  })

  test("exposes machine-readable feature metadata without changing Vite usage", () => {
    const plugins = [
      pluginSsg(),
      pluginImage(),
      pluginIsland(),
      pluginEntry(),
      pluginSearch(),
      pluginComment(),
      pluginSvg(),
      pluginBeautify(),
      pluginArchive(),
      pluginSprite(),
    ]

    expect(
      plugins.map((plugin) => plugin.api.minista.feature.id),
    ).toEqual([
      "ssg",
      "image",
      "island",
      "entry",
      "search",
      "comment",
      "svg",
      "beautify",
      "archive",
      "sprite",
    ])
    expect(plugins[0].api.minista.feature).toMatchObject({
      apiVersion: 1,
      provides: ["routes", "pages", "html", "html-documents"],
      requires: [],
    })
    expect(plugins[5].api.minista.feature.requires).toEqual(["html-documents"])
    expect(plugins[1].api.minista.feature.requires).toEqual(["html-documents"])
    expect(plugins[6].api.minista.feature.requires).toEqual(["html-documents"])
    expect(plugins[4].api.minista.feature.requires).toEqual(["html-documents"])
    expect(plugins[7].api.minista.feature.requires).toEqual([
      "html-documents",
      "output-files",
    ])
    expect(plugins[8].api.minista.feature.requires).toEqual(["output-files"])
    expect(plugins[8].api.minista.feature.optionalAfter).toEqual(["beautify"])
    expect(plugins[9].api.minista.feature.requires).toEqual(["html-documents"])
  })
})
