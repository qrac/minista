/** @typedef {import('vite').UserConfig} UserConfig */
/** @typedef {import('rollup').OutputBundle} OutputBundle */
/** @typedef {import('rollup').OutputAsset} OutputAsset */
/** @typedef {import('rollup').OutputChunk} OutputChunk */

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
