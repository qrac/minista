import { expect, test } from "vitest"
import { defaultOptions, resolveSearchOptions } from "../../../src/plugins/search/internal/options.js"
import { resolveSearchIndex } from "../../../src/features/search/reference.js"
import { getSearchIndexes } from "../../../src/features/search/index.js"

test("preserves the single-index defaults and legacy overrides", () => {
  expect(resolveSearchOptions()).toEqual(defaultOptions)
  const options = resolveSearchOptions({ indexes: undefined, src: ['docs/**/*.html'], outName: 'docs', hit: { minLength: 2 } })
  expect(options).toEqual({ ...defaultOptions, src: ['docs/**/*.html'], outName: 'docs', hit: { ...defaultOptions.hit, minLength: 2 } })
  expect(resolveSearchIndex(getSearchIndexes(options), undefined, false)).toEqual(options)
  expect(() => resolveSearchIndex(getSearchIndexes(options), 'docs', false)).toThrow('MINISTA_SEARCH_INDEX_UNKNOWN')
})

test("inherits extraction and hit options, replaces arrays, and keeps output and selection local", () => {
  const config = resolveSearchOptions({
    trimTitle: ' | Site', targetSelector: 'main', ignoreSelectors: ['.shared'],
    inputAttr: 'data-find', relativeAttr: 'data-level', hit: { minLength: 2, kanji: false },
    indexes: {
      en: { ignore: ['ja/**'], hit: { english: false } },
      ja: { src: ['ja/**/*.html'], outName: 'japanese', ignoreSelectors: [], hit: { kanji: true } },
    },
  })
  const [en, ja] = getSearchIndexes(config)
  expect(en).toMatchObject({ name: 'en', outName: 'search-en', src: ['**/*.html'], ignore: ['ja/**'], trimTitle: ' | Site', targetSelector: 'main', ignoreSelectors: ['.shared'], inputAttr: 'data-find', relativeAttr: 'data-level', hit: { minLength: 2, english: false, kanji: false } })
  expect(ja).toMatchObject({ name: 'ja', outName: 'japanese', src: ['ja/**/*.html'], ignore: ['404.html'], ignoreSelectors: [], hit: { minLength: 2, english: true, kanji: true } })
  expect(resolveSearchIndex(getSearchIndexes(config), 'ja', true)).toBe(ja)
  const one = getSearchIndexes(resolveSearchOptions({ indexes: { ja: {} } }))
  expect(() => resolveSearchIndex(one, undefined, true)).toThrow('MINISTA_SEARCH_INDEX_REQUIRED')
  expect(() => resolveSearchIndex(one, 'toString', true)).toThrow('MINISTA_SEARCH_INDEX_UNKNOWN')
})

test.each([
  [{ indexes: {} }, 'MINISTA_SEARCH_INDEXES_INVALID'],
  [{ indexes: null }, 'MINISTA_SEARCH_INDEXES_INVALID'],
  [{ indexes: [] }, 'MINISTA_SEARCH_INDEXES_INVALID'],
  [{ indexes: { ja: null } }, 'MINISTA_SEARCH_INDEX_OPTIONS_INVALID'],
  [{ indexes: { '../ja': {} } }, 'MINISTA_SEARCH_INDEX_NAME_INVALID'],
  [{ indexes: { '': {} } }, 'MINISTA_SEARCH_INDEX_NAME_INVALID'],
  [{ indexes: { en: { outName: 'same' }, ja: { outName: 'same' } } }, 'MINISTA_SEARCH_OUTPUT_CONFLICT'],
  [{ indexes: { ja: {} }, src: ['**/*.html'] }, 'MINISTA_SEARCH_INDEX_OPTIONS_INVALID'],
])("rejects invalid configuration with a structured diagnostic: %j", (options, code) => {
  expect(() => resolveSearchOptions(/** @type {any} */ (options))).toThrow(expect.objectContaining({
    diagnostic: expect.objectContaining({ code, severity: 'error', feature: 'feature:search' }),
  }))
})
