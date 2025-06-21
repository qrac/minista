/** @typedef {import('rolldown-vite').UserConfig} UserConfig */
/** @typedef {import('rolldown-vite').Alias} Alias */
/** @typedef {import('rolldown').OutputBundle} OutputBundle */
/** @typedef {import('rolldown').OutputAsset} OutputAsset */
/** @typedef {import('rolldown').OutputChunk} OutputChunk */

/**
 * @param {UserConfig} config
 * @param {string[]} modules
 * @returns {UserConfig['ssr']['external']}
 */
export function mergeSsrExternal(config, modules = []) {
  const ssrExternal = config.ssr?.external

  if (typeof ssrExternal === "undefined") {
    return modules
  }
  if (Array.isArray(ssrExternal)) {
    return Array.from(new Set([...ssrExternal, ...modules]))
  }
  return ssrExternal
}

/**
 * @param {UserConfig} config
 * @param {Alias[]} aliases
 * @returns {UserConfig['resolve']['alias']}
 */
export function mergeAlias(config, aliases = []) {
  const existing = config.resolve?.alias

  let list = Array.isArray(existing)
    ? [...existing]
    : existing && typeof existing === "object"
    ? Object.entries(existing).map(([find, replacement]) => ({
        find,
        replacement,
      }))
    : []

  const findSet = new Set(list.map((item) => item.find))

  for (const alias of aliases) {
    if (!findSet.has(alias.find)) {
      list.push(alias)
      findSet.add(alias.find)
    }
  }
  return list
}

/**
 * @param {OutputBundle} bundle
 * @returns {{[key:string]:OutputChunk}}
 */
export function filterOutputChunks(bundle) {
  return Object.entries(bundle).reduce((acc, [key, item]) => {
    if (item.type === "chunk") {
      acc[key] = item
    }
    return acc
  }, /** @type {{[key:string]:OutputChunk}} */ ({}))
}

/**
 * @param {OutputBundle} bundle
 * @returns {{[key:string]:OutputAsset}}
 */
export function filterOutputAssets(bundle) {
  return Object.entries(bundle).reduce((acc, [key, item]) => {
    if (item.type === "asset") {
      acc[key] = item
    }
    return acc
  }, /** @type {{[key:string]:OutputAsset}} */ ({}))
}
