import { expect, test } from "vitest"
import { tokenizeSearchText } from "../../src/features/search/tokenize.js"
import legacy from "../helpers/search/mojigiri-0.3.0.js"

test("matches the legacy tokenizer across UTF-16 boundaries and mixed runs", () => {
  // Every code unit in context, including whitespace, unpaired surrogates and range edges.
  for (let start = 0; start < 65536; start += 256) {
    const input = Array.from({ length: 256 }, (_, i) => `a${String.fromCharCode(start + i)}あ`).join("")
    expect(tokenizeSearchText(input)).toEqual(legacy(input))
  }
  let seed = 42
  for (let sample = 0; sample < 300; sample++) {
    const input = Array.from({ length: 100 }, () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
      return String.fromCodePoint(seed % 0x110000)
    }).join("")
    expect(tokenizeSearchText(input)).toEqual(legacy(input))
  }
})

test.each([
  "ＡＢａｂ１２3abc", "一二三人百万円", "ー〜カナーひらがな", "\t\r\n 　", 
  "𠮷𠮷漢字👨‍👩‍👧‍👦éÉ", "がガｶﾞ", "C++ [a.b] ...",
])("preserves legacy grouping and repeated-call isolation: %s", (input) => {
  expect(tokenizeSearchText(input)).toEqual(legacy(input))
  tokenizeSearchText("another入力")
  expect(tokenizeSearchText(input)).toEqual(legacy(input))
})
