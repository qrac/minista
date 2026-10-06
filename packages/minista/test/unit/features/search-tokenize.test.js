import { describe, expect, it } from "vitest"
import { tokenizeSearchText } from "../../../src/features/search/tokenize.js"

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
