// @ts-check

import { cleanObj, mergeObj } from "../../../shared/obj.js"
import { SearchIndexError } from "../../../features/search/reference.js"

/** @type {import("../types.js").PluginOptions} */
export const defaultOptions = {
  outName: "search",
  src: ["**/*.html"],
  ignore: ["404.html"],
  trimTitle: "",
  targetSelector: "[data-search]",
  ignoreSelectors: [],
  relativeAttr: "data-search-relative",
  inputAttr: "data-search-input",
  hit: {
    minLength: 3,
    number: false,
    english: true,
    hiragana: false,
    katakana: true,
    kanji: true,
  },
}

/**
 * @param {import("../types.js").UserPluginOptions} [options]
 * @returns {import("../../../features/search/index.js").SearchFeatureConfig}
 */
export function resolveSearchOptions(options = {}) {
  const { indexes, outName, src, ignore, ...common } = options
  if (indexes === undefined) {
    const { indexes: _, ...legacy } = options
    return mergeObj(defaultOptions, legacy)
  }
  if (!indexes || typeof indexes !== "object" || Array.isArray(indexes) || !Object.keys(indexes).length) {
    throw new SearchIndexError("MINISTA_SEARCH_INDEXES_INVALID", "pluginSearch() indexes must be a non-empty object.")
  }
  if (outName !== undefined || src !== undefined || ignore !== undefined) {
    throw new SearchIndexError("MINISTA_SEARCH_INDEX_OPTIONS_INVALID", "In indexes mode, specify outName, src and ignore inside each index.")
  }
  const outputNames = new Set()
  return {
    indexes: Object.entries(indexes).map(([name, overrides]) => {
      if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(name)) {
        throw new SearchIndexError("MINISTA_SEARCH_INDEX_NAME_INVALID", `Invalid Search index name ${JSON.stringify(name)}. Use letters, numbers, hyphens or underscores, starting with a letter or number.`)
      }
      if (!overrides || typeof overrides !== "object" || Array.isArray(overrides)) {
        throw new SearchIndexError("MINISTA_SEARCH_INDEX_OPTIONS_INVALID", `Search index ${JSON.stringify(name)} must be an options object.`)
      }
      const resolved = mergeObj(mergeObj(defaultOptions, cleanObj(common)), cleanObj(overrides))
      resolved.outName = overrides.outName ?? `search-${name}`
      if (outputNames.has(resolved.outName)) {
        throw new SearchIndexError("MINISTA_SEARCH_OUTPUT_CONFLICT", `Search indexes must have distinct outName values: ${JSON.stringify(resolved.outName)}.`)
      }
      outputNames.add(resolved.outName)
      return { ...resolved, name }
    }),
  }
}
