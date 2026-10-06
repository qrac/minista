import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { afterEach, expect, test } from "vitest"
import { composeViteSsgPublicAssets } from "../../../src/adapters/vite/ssg-public-assets.js"

/** @type {string[]} */
const roots = []
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })))
})

test("uses the resolved public directory, keeps Entry priority and refreshes files for every build", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "minista-public-"))
  roots.push(root)
  const publicDir = path.join(root, "static-files")
  await fs.mkdir(path.join(publicDir, "site"), { recursive: true })
  for (const name of ["logo.svg", "site/logo.svg", "app.js", ".hidden"]) {
    await fs.writeFile(path.join(publicDir, name), "public")
  }
  const config = /** @type {import("vite").ResolvedConfig} */ (/** @type {unknown} */ ({
    publicDir, base: "/site/", plugins: [{
      name: "island", api: { minista: { feature: { id: "island", options: { rootAttrName: "custom" } } } },
    }],
  }))
  const pages = [{ url: "/demos/", fileName: "demos/index.html", html:
    '<img src="/logo.svg"><img src="/site/logo.svg"><script src="/app.js"></script><a href="/.hidden">Hidden</a><div data-custom-client-snippet="test"><img src="/logo.svg"></div>',
  }]
  const entrySources = new Set(["app.js"])
  const [output] = await composeViteSsgPublicAssets(pages, config, entrySources)
  expect(output.html).toContain('<img src="/site/logo.svg"><img src="/site/logo.svg">')
  expect(output.html).toContain('src="/app.js"')
  expect(output.html).toContain('href="/site/.hidden"')
  expect(output.html).toContain('<div data-custom-client-snippet="test"><img src="/logo.svg">')
  expect(pages[0].html).toContain('<img src="/logo.svg">')
  await fs.rm(path.join(publicDir, "logo.svg"))
  const [next] = await composeViteSsgPublicAssets(pages, config, entrySources)
  expect(next.html).toContain('<img src="/logo.svg"><img src="/site/site/logo.svg">')

  for (const disabled of ["", path.join(root, "missing")]) {
    expect(await composeViteSsgPublicAssets(pages, { ...config, publicDir: disabled }, entrySources)).toBe(pages)
  }
})
