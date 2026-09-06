import { expect, test } from "vitest"
import { getViteDevStyles } from "../../../src/adapters/vite/dev-styles.js"

test("preserves dependency order, deduplicates cycles and excludes CSS data imports under a base", () => {
  /** @param {string} url @param {any[]} dependencies */
  const node = (url, dependencies = []) => ({
    id: url, url, importedModules: new Set(dependencies),
  })
  const shared = node("/src/shared.scss")
  const component = node("/src/component.jsx", [shared, node("/src/part.module.css?theme=dark")])
  const layout = node("/src/layout.jsx", [shared, component])
  component.importedModules.add(layout)
  const page = node("/src/page.jsx", [
    component,
    node("/src/data.css?inline"),
    node("/src/data.css?raw"),
    node("/src/data.css?url"),
    node("/@fs/external/style.css"),
  ])
  const modules = new Map([layout, page].map((module) => [module.id, module]))
  const server = /** @type {any} */ ({
    config: { base: "/preview/" },
    environments: { ssr: { moduleGraph: { getModuleById: (/** @type {string} */ id) => modules.get(id) } } },
  })
  expect(getViteDevStyles(server, [layout.id, page.id]).map((tag) => tag.attrs?.href))
    .toEqual([
      "/src/shared.scss?direct",
      "/src/part.module.css?theme=dark&direct",
      "/@fs/external/style.css?direct",
    ])
})
