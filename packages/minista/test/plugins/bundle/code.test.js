import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { build } from "vite"

import { getGlobImportCode } from "../../../src/plugins/bundle/utils/code.js"

const options = {
  src: ["/src/pages/**/*.{tsx,jsx,mdx}"],
  outName: "bundle",
  useExportCss: true,
}

/** @type {string | undefined} */
let fixtureDir

afterEach(async () => {
  if (fixtureDir) {
    await fs.promises.rm(fixtureDir, { recursive: true, force: true })
    fixtureDir = undefined
  }
})

describe("getGlobImportCode", () => {
  it("開発時はページをeager importする", () => {
    expect(getGlobImportCode(options)).toBe(
      'import.meta.glob(["/src/pages/**/*.{tsx,jsx,mdx}"], { eager: true })',
    )
  })

  it("build時はページexportをtree-shakingから保護する", () => {
    expect(getGlobImportCode(options, true)).toBe(
      'globalThis.__ministaBundleModules = import.meta.glob(["/src/pages/**/*.{tsx,jsx,mdx}"], { eager: true })',
    )
  })

  it("build時にページが利用するCSS Modulesを出力する", async () => {
    fixtureDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), "minista-bundle-test-"),
    )
    const pagesDir = path.join(fixtureDir, "src/pages")
    await fs.promises.mkdir(pagesDir, { recursive: true })
    await Promise.all([
      fs.promises.writeFile(
        path.join(fixtureDir, "entry.js"),
        getGlobImportCode(options, true),
        "utf8",
      ),
      fs.promises.writeFile(
        path.join(pagesDir, "index.jsx"),
        [
          'import styles from "./index.module.css"',
          "export default styles.heading",
        ].join("\n"),
        "utf8",
      ),
      fs.promises.writeFile(
        path.join(pagesDir, "index.module.css"),
        ".heading { color: red; }",
        "utf8",
      ),
    ])

    const result = await build({
      root: fixtureDir,
      logLevel: "silent",
      build: {
        write: false,
        rolldownOptions: { input: path.join(fixtureDir, "entry.js") },
      },
    })
    const outputs = Array.isArray(result)
      ? result.flatMap(({ output }) => output)
      : result.output
    const css = outputs
      .filter((item) => item.type === "asset" && item.fileName.endsWith(".css"))
      .map((item) => String(item.source))
      .join("\n")

    expect(css).toContain("color:red")
  })
})
