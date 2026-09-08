import { expect, test } from "vitest"
import { createSearchData } from "../../../src/features/search/create-search-data.js"

const hit = { minLength: 2, number: false, english: true, hiragana: false, katakana: true, kanji: true }
test("keeps sorted dictionary, hit indexes, token order, duplicates and URL ordering", () => {
  const data = createSearchData([
    { url: "/z", words: ["猫", "Alpha", "...", "123", "かな", "カナ", "猫"], title: ["Alpha"], content: ["猫", "Alpha", "猫"], toc: [[1, "heading"]] },
    { url: "/A", words: ["Beta", "Alpha"], title: ["Beta", "Alpha"], content: ["Beta", "Beta"], toc: [] },
  ], hit)
  expect(data).toEqual({
    words: ["...", "123", "Alpha", "Beta", "かな", "カナ", "猫"], hits: [2, 3, 5],
    pages: [
      { url: "/A", title: [3, 2], content: [3, 3], toc: [] },
      { url: "/z", title: [2], content: [6, 2, 6], toc: [[1, "heading"]] },
    ],
  })
  expect(createSearchData([], hit)).toEqual({ words: [], hits: [], pages: [] })
  expect(Object.isFrozen(data.words)).toBe(true)
})
