import { describe, expect, test } from "vitest"

import {
  defineConfig,
  pluginArchive,
  pluginBeautify,
  pluginComment,
  pluginEntry,
  pluginImage,
  pluginIsland,
  pluginSearch,
  pluginSprite,
  pluginSsg,
  pluginSvg,
} from "../../src/node.js"

describe("public API compatibility", () => {
  test("exports every documented plugin factory", () => {
    const factories = [
      pluginSsg,
      pluginEntry,
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

  test("keeps plugin names", () => {
    expect(pluginSsg().name).toBe("vite-plugin:minista-ssg")
    expect(pluginImage().name).toBe("vite-plugin:minista-image")
    expect(pluginIsland().name).toBe("vite-plugin:minista-island")
  })

  test("integrates bundle and lazy MDX configuration into pluginSsg", () => {
    const defaults = pluginSsg().api.minista.feature
    expect(defaults.options.bundle).toEqual({ outName: "bundle" })
    expect(defaults.options.mdx).toMatchObject({
      frontmatter: { name: "metadata" },
      remarkPlugins: [],
      rehypePlugins: [],
    })
    expect(defaults.options.src).toEqual([
      "src/pages/**/*.{tsx,jsx,mdx,md}",
    ])
    expect(defaults.options.layout).toBe("src/layouts/index.{tsx,jsx}")
    expect(defaults.options.srcBases).toEqual(["src/pages"])

    const withoutMdx = pluginSsg({ mdx: false }).api.minista.feature
    expect(withoutMdx.options.src).toEqual([
      "src/pages/**/*.{tsx,jsx}",
    ])
    expect(withoutMdx.provides).not.toContain("mdx-modules")
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
      provides: [
        "routes",
        "pages",
        "html",
        "html-documents",
        "client-bundle",
        "mdx-modules",
      ],
      requires: [],
    })
    expect(plugins[5].api.minista.feature.requires).toEqual(["html-documents"])
    expect(plugins[1].api.minista.feature.requires).toEqual(["html-documents"])
    expect(plugins[2].api.minista.feature.requires).toEqual(["html-documents"])
    expect(plugins[6].api.minista.feature.requires).toEqual(["html-documents"])
    expect(plugins[4].api.minista.feature.requires).toEqual(["html-documents"])
    expect(plugins[7].api.minista.feature.requires).toEqual([
      "html-documents",
      "output-files",
    ])
    expect(plugins[8].api.minista.feature.requires).toEqual(["output-files"])
    expect(plugins[8].api.minista.feature.optionalAfter).toEqual(["beautify"])
    expect(plugins[9].api.minista.feature.requires).toEqual(["html-documents"])
    expect(pluginEntry().api.minista.feature.requires).toEqual([
      "html-documents",
    ])
  })
})
