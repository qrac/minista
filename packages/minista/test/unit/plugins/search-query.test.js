import { expect, test } from "vitest"
import { prepareSearchQuery, querySearch } from "../../../src/plugins/search/internal/query.js"

/** @type {import("../../../src/plugins/search/types.js").SearchData} */
const data = {
  words: ["Alpha", "Beta", "C++", "かな", "カナ"], hits: [0, 1, 2, 4],
  pages: [
    { url: "/title", title: [0, 0, 1], content: [0], toc: [] },
    { url: "/body", title: [3], content: [1, 4, 0, 0], toc: [[0, "first"], [2, "last"]] },
    { url: "/tie", title: [3], content: [0, 1], toc: [] },
  ],
}
test("preserves unique-word ranking, stable ties, dictionary-first excerpt and toc location", () => {
  const before = JSON.stringify(data)
  const prepared = prepareSearchQuery(data)
  expect(querySearch(prepared, "Beta Alpha Alpha", { maxHitWords: 2 })).toEqual({
    values: ["Alpha", "Beta"], hitValues: ["Alpha", "Beta"], results: [
      { url: "/title", content: "Alpha Alpha Beta" },
      { url: "/body#last", content: "...Alpha Alpha..." },
      { url: "/tie", content: "...Alpha Beta..." },
    ],
  })
  expect(querySearch(prepared, "ALPHA", { maxHitPages: 1 }).results).toEqual([{ url: "/title", content: "Alpha Alpha Beta" }])
  expect(querySearch(prepared, "かな").results).toEqual([])
  expect(querySearch(prepared, "A").results).toEqual([])
  expect(querySearch(prepared, "").results).toEqual([])
  expect(JSON.stringify(data)).toBe(before)
})
