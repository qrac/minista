import { expect, test } from "vitest"
import { getViteChunkCss } from "../../../src/adapters/vite/chunk-css.js"

/** @param {string} fileName @param {string[]} imports @param {string[]} css */
function chunk(fileName, imports, css) {
  return { fileName, imports, viteMetadata: { importedCss: new Set(css) } }
}

test("collects shared CSS before entry CSS without duplicates or circular recursion", () => {
  const chunks = {
    "entry.js": chunk("entry.js", ["first.js", "second.js"], ["entry.css"]),
    "first.js": chunk("first.js", ["shared.js"], ["first.css"]),
    "second.js": chunk("second.js", ["shared.js"], ["first.css", "second.css"]),
    "shared.js": chunk("shared.js", ["entry.js"], ["shared.css"]),
  }
  expect(getViteChunkCss(chunks["entry.js"], chunks))
    .toEqual(["shared.css", "first.css", "second.css", "entry.css"])
})

test("ignores external imports, unrelated entries and async CSS", () => {
  const entry = {
    fileName: "entry.js", imports: ["external", "shared.js"],
    dynamicImports: ["lazy.js"],
  }
  const chunks = {
    "entry.js": entry,
    "shared.js": chunk("shared.js", [], ["shared.css"]),
    "lazy.js": chunk("lazy.js", [], ["lazy.css"]),
    "other.js": chunk("other.js", [], ["other.css"]),
  }
  expect(getViteChunkCss(entry, chunks)).toEqual(["shared.css"])
})
