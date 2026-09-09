import { describe, expect, it, test } from "vitest"
import { tokenizeSearchText } from "../../../src/features/search/tokenize.js"
import legacy from "../../helpers/search/mojigiri-0.3.0.js"

// Examples adapted from mojigiri (MIT, Copyright (c) 2022 Qrac).
describe("Basic Test", () => {
  it("Example 1", () => {
    const result = tokenizeSearchText("日本語テキスト100を「文字の種類」でsplitする。")

    //console.log("result", result)
    /* prettier-ignore */
    expect(result).toEqual(["日本語", "テキスト", "100", "を", "「", "文字", "の", "種類", "」", "で", "split", "する", "。"])
  })

  it("Example 2", () => {
    const text =
      "[number-:01]/index.tsx という Next.jsのようなReact(JSX)。©QRANOKO"
    const result = tokenizeSearchText(text)

    //console.log("result", result)
    /* prettier-ignore */
    expect(result).toEqual(["[","number","-",":","01","]","/","index",".","tsx"," ","という"," ","Next",".","js","のような","React","(","JSX",")","。","©","QRANOKO"])
  })

  it("Example 3", () => {
    const text = "※注意メニュー"
    const result = tokenizeSearchText(text)

    //console.log("result", result)
    expect(result).toEqual(["※", "注意", "メニュー"])
  })

  it("Example 4", () => {
    const text = "絵文字✋を🎉👏漢字やカナ🗒に「👍🥳👍混ぜた」場合"
    const result = tokenizeSearchText(text)

    //console.log("result", result)
    /* prettier-ignore */
    expect(result).toEqual(["絵文字","✋","を","🎉👏","漢字","や","カナ","🗒","に","「","👍🥳👍","混","ぜた","」","場合"])
  })

  it("One", () => {
    const text = "テキスト"
    const result = tokenizeSearchText(text)

    //console.log("result", result)
    expect(result).toEqual(["テキスト"])
  })

  it("Null", () => {
    const text = ""
    const result = tokenizeSearchText(text)

    //console.log("result", result)
    expect(result).toEqual([])
  })
})


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
