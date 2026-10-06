// Run from the repository root: node scripts/benchmark-search.js [baseline-ref]
// Each sample runs in a fresh process; input allocation is outside the timer.
import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import assert from "node:assert/strict"
import { performance } from "node:perf_hooks"
import { createSearchData } from "../packages/minista/src/features/search/create-search-data.js"

const hit = { minLength: 1, number: true, english: true, hiragana: true, katakana: true, kanji: true }
const cases = [[1, 1000, 1000], [1, 10000, 10000], [100, 1000, 1000], [100, 10000, 1000], [1000, 10000, 1000]]
if (process.argv[2] === "--sample") {
  const [mode, ref, count, vocabulary, tokens] = process.argv.slice(3)
  let generate = createSearchData
  if (mode === "before") {
    const source = execFileSync("git", ["show", `${ref}:packages/minista/src/features/search/search.js`], { encoding: "utf8" })
    const body = source.slice(source.indexOf("export function createSearchData(analyses"), source.indexOf("/**\n * @param {HtmlDocument}", source.indexOf("export function createSearchData(analyses")))
    generate = (await import(`data:text/javascript,${encodeURIComponent(body)}`)).createSearchData
  }
  const words = Array.from({ length: +vocabulary }, (_, i) => `word${String(i).padStart(6, "0")}`)
  const analyses = Array.from({ length: +count }, (_, p) => {
    const content = Array.from({ length: +tokens }, (_, i) => words[(p * +tokens + i) % words.length])
    return { url: `/p${p}`, words: [words[p % words.length], ...content], title: [words[p % words.length]], content, toc: [[0, "start"]] }
  })
  global.gc()
  const before = process.memoryUsage().heapUsed
  const start = performance.now()
  const data = generate(analyses, hit)
  const ms = performance.now() - start
  const heapMiB = (process.memoryUsage().heapUsed - before) / 1024 ** 2
  console.log(JSON.stringify({ ms, heapMiB, rssMiB: process.resourceUsage().maxRSS / 1024, sha256: createHash("sha256").update(JSON.stringify(data)).digest("hex") }))
} else {
  const ref = process.argv[2] || "HEAD"
  console.log(JSON.stringify({ node: process.version, platform: process.platform, arch: process.arch, baseline: execFileSync("git", ["rev-parse", ref], { encoding: "utf8" }).trim() }))
  for (const size of cases) {
    let expectedHash
    for (const mode of ["before", "after"]) {
      const samples = Array.from({ length: 3 }, () => JSON.parse(execFileSync(process.execPath, ["--expose-gc", import.meta.filename, "--sample", mode, ref, ...size.map(String)], { encoding: "utf8" })))
      for (const sample of samples) {
        expectedHash ??= sample.sha256
        assert.equal(sample.sha256, expectedHash)
      }
      console.log(JSON.stringify({ pages: size[0], vocabulary: size[1], contentTokens: size[0] * size[2], mode, samples }))
    }
  }
}
