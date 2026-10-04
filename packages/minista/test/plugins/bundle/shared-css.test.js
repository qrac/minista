import fs from "node:fs/promises"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { execFile } from "node:child_process"
import { promisify } from "node:util"

import { extractUrls, getBasedAssetUrl } from "../../../src/shared/url.js"

let fixtureDir

afterEach(async () => {
  if (fixtureDir) {
    await fs.rm(fixtureDir, { recursive: true, force: true })
    fixtureDir = undefined
  }
})

async function buildFixture(base, useBundle = true, useExportCss = true) {
  // Keep the fixture below the workspace so SSR can resolve React and minista.
  fixtureDir = await fs.mkdtemp(path.resolve("playground/minista-css-test-"))
  await fs.mkdir(path.join(fixtureDir, "src/components"), { recursive: true })
  await fs.mkdir(path.join(fixtureDir, "src/pages/nest"), { recursive: true })
  const files = {
    "package.json": '{"type":"module"}',
    "src/components/Card.jsx": [
      'import styles from "./Card.module.css"',
      'export default function Card() { return <div className={styles.card}>Shared component CSS</div> }',
    ].join("\n"),
    "src/components/Card.module.css": ".card { color: blue; padding: 20px; }",
    "src/other.js": 'import Card from "./components/Card.jsx"; globalThis.OtherCard = Card',
    "src/client.js": useBundle
      ? 'export { default as Card } from "./components/Card.jsx"'
      : 'import Card from "./components/Card.jsx"; globalThis.Card = Card',
    "src/pages/index.jsx": [
      'import { Head } from "minista/head"',
      'import Card from "../components/Card.jsx"',
      `export default function Page() { return <><Head><script type="module" src="/src/client.js" />${useBundle ? "" : '<script type="module" src="/src/other.js" />'}</Head><Card /></> }`,
    ].join("\n"),
    "src/pages/nest/index.jsx": 'export { default } from "../index.jsx"',
  }
  await Promise.all(Object.entries(files).map(([file, code]) =>
    fs.writeFile(path.join(fixtureDir, file), code, "utf8"),
  ))

  // Build in Node so SSR and HeadProvider share the same React context.
  const { stdout } = await promisify(execFile)(process.execPath, [
    "--input-type=module", "-e", `
      import { build } from "vite"
      import { pluginSsg } from "./packages/minista/src/plugins/ssg/index.js"
      import { pluginBundle } from "./packages/minista/src/plugins/bundle/index.js"
      import { pluginEntry } from "./packages/minista/src/plugins/entry/index.js"
      const config = () => ({
        configFile: false,
        root: ${JSON.stringify(fixtureDir)},
        base: ${JSON.stringify(base)},
        logLevel: "silent",
        plugins: [pluginSsg(),
          ...(${useBundle} ? [pluginBundle({ useExportCss: ${useExportCss} })] : []),
          pluginEntry()],
      })
      await build({ ...config(), build: { ssr: true } })
      const result = await build({ ...config(), build: { write: false } })
      console.log(JSON.stringify(result.output.map((item) => ({
        type: item.type, fileName: item.fileName, source: item.source,
        name: item.name, isEntry: item.isEntry,
        importedCss: [...(item.viteMetadata?.importedCss || [])],
      }))))
    `,
  ])
  return JSON.parse(stdout)
}

describe("shared CSS Modules", () => {
  it.each(["/", "/site/", "./"])(
    "SSGとclient entryで共有するCSSをHTMLへ一度だけ追加する (base: %s)",
    async (base) => {
      const outputs = await buildFixture(base)
      const css = outputs.find((item) => item.type === "asset" &&
        item.fileName.endsWith(".css") && String(item.source).includes("padding:20px"))
      expect(css).toBeDefined()
      expect(String(css.source)).toContain("padding:20px")
      const shared = outputs.find((item) => item.type === "chunk" &&
        !item.isEntry && item.importedCss.includes(css.fileName))
      expect(shared).toBeDefined()
      const htmlItems = outputs.filter((item) => item.fileName.endsWith(".html"))
      expect(htmlItems).toHaveLength(2)
      for (const html of htmlItems) {
        expect(String(html.source)).toContain("Shared component CSS")
        const urls = [...String(html.source).matchAll(/<link[^>]*href="([^"]+)"/g)]
          .map((match) => match[1])
        expect(urls.filter((url) => url === getBasedAssetUrl(base, html.fileName, css.fileName)))
          .toHaveLength(1)
        expect(extractUrls(String(html.source), "script", "src"))
          .not.toContain("/src/client.js")
      }
      expect(outputs.some((item) => item.type === "chunk" && item.name === "bundle"))
        .toBe(false)
    },
  )

  it("pluginEntry単独でも共有chunkのCSSをHTMLへ追加する", async () => {
    const outputs = await buildFixture("/", false)
    const css = outputs.find((item) => item.type === "asset" && item.fileName.endsWith(".css"))
    expect(css).toBeDefined()
    expect(outputs.some((item) => item.type === "chunk" &&
      !item.isEntry && item.importedCss.includes(css.fileName))).toBe(true)
    for (const html of outputs.filter((item) => item.fileName.endsWith(".html"))) {
      expect(extractUrls(String(html.source), "link", "href"))
        .toContain(`/${css.fileName}`)
    }
  })

  it("useExportCss: falseでは共有CSSや削除済みCSSへのlinkを出力しない", async () => {
    const outputs = await buildFixture("/", true, false)
    expect(outputs.some((item) => item.fileName.endsWith(".css"))).toBe(false)
    for (const html of outputs.filter((item) => item.fileName.endsWith(".html"))) {
      expect(extractUrls(String(html.source), "link", "href")).toEqual([])
    }
  })
})
