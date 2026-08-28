import { describe, expect, test } from "vitest"

import {
  getGlobImportCode,
  toViteRootPath,
} from "../../../src/plugins/ssg/utils/code.js"

/** @type {Pick<import("../../../src/plugins/ssg/types").PluginOptions, "bundle" | "mdx" | "srcBases">} */
const baseOptions = {
  bundle: { outName: "bundle" },
  mdx: false,
  srcBases: ["src/pages"],
}

describe("SSG glob import code", () => {
  test("converts option paths to Vite root paths", () => {
    expect(toViteRootPath("src/pages/**/*.jsx")).toBe("/src/pages/**/*.jsx")
    expect(toViteRootPath("/src/pages/**/*.jsx")).toBe("/src/pages/**/*.jsx")
  })

  test("treats paths with and without a leading slash equally", () => {
    const relative = getGlobImportCode({
      ...baseOptions,
      layout: "src/layouts/index.jsx",
      src: ["src/pages/**/*.jsx"],
    })
    const legacy = getGlobImportCode({
      ...baseOptions,
      layout: "/src/layouts/index.jsx",
      src: ["/src/pages/**/*.jsx"],
      srcBases: ["/src/pages"],
    })

    expect(relative).toBe(legacy)
    expect(relative).toContain('import.meta.glob(["/src/layouts/index.jsx"]')
    expect(relative).toContain('import.meta.glob(["/src/pages/**/*.jsx"]')
  })
})
