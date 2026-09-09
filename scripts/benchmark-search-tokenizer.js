// node scripts/benchmark-search-tokenizer.js
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { performance } from "node:perf_hooks"
import legacy from "../packages/minista/test/helpers/search/mojigiri-0.3.0.js"
import { tokenizeSearchText } from "../packages/minista/src/features/search/tokenize.js"

const sentence = "日本語テキスト100を「文字の種類」でsplitする。React の JSX ＡＢａｂ 𠮷👨‍👩‍👧‍👦\n"
const cases = { short: [sentence, 100000], long: [sentence.repeat(1000), 100] }
if (process.argv[2] === "--sample") {
  const [mode, name] = process.argv.slice(3)
  const [text, count] = cases[name]
  assert.deepEqual(tokenizeSearchText(text), legacy(text))
  const tokenize = mode === "before" ? legacy : tokenizeSearchText
  for (let i = 0; i < 10; i++) tokenize(text)
  global.gc()
  const heap = process.memoryUsage().heapUsed
  const start = performance.now()
  let tokens = 0
  for (let i = 0; i < count; i++) tokens += tokenize(text).length
  console.log(JSON.stringify({ ms: performance.now() - start, heapMiB: (process.memoryUsage().heapUsed - heap) / 1024 ** 2, rssMiB: process.resourceUsage().maxRSS / 1024, tokens }))
} else {
  console.log(JSON.stringify({ node: process.version, platform: process.platform, arch: process.arch }))
  for (const [name, [text, count]] of Object.entries(cases)) {
    for (const mode of ["before", "after"]) {
      const samples = Array.from({ length: 5 }, () => JSON.parse(execFileSync(process.execPath, ["--expose-gc", import.meta.filename, "--sample", mode, name], { encoding: "utf8" })))
      console.log(JSON.stringify({ name, mode, codeUnits: text.length, count, samples }))
    }
  }
}
