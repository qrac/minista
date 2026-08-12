/** @typedef {import('vite').UserConfig} UserConfig */
/** @typedef {import('vite').SSROptions} SSROptions */
/** @typedef {import('vite').Alias} Alias */
/** @typedef {import('rolldown').OutputBundle} OutputBundle */
/** @typedef {import('rolldown').OutputAsset} OutputAsset */
/** @typedef {import('rolldown').OutputChunk} OutputChunk */
/** @typedef {NonNullable<import('vite').BuildOptions['rolldownOptions']>['external']} RolldownExternal */
/** @typedef {{ssr?: {external?: SSROptions['external'], noExternal?: SSROptions['noExternal'] | false}, resolve?: UserConfig['resolve']}} ViteConfigLike */

/**
 * @param {ViteConfigLike} config
 * @param {string[]} modules
 * @returns {SSROptions['external']}
 */
export function mergeSsrExternal(config, modules = []) {
  const ssrExternal = config.ssr?.external

  if (ssrExternal === true) {
    return true
  }
  if (typeof ssrExternal === "undefined") {
    return modules
  }
  if (Array.isArray(ssrExternal)) {
    return Array.from(new Set([...ssrExternal, ...modules]))
  }
  return ssrExternal
}

/**
 * @param {ViteConfigLike} config
 * @param {string[]} modules
 * @returns {SSROptions['noExternal']}
 */
export function mergeSsrNoExternal(config, modules = []) {
  const noExternal = config.ssr?.noExternal

  if (noExternal === true) {
    return true
  }
  if (typeof noExternal === "undefined") {
    return modules
  }
  if (Array.isArray(noExternal)) {
    return Array.from(new Set([...noExternal, ...modules]))
  }
  return /** @type {SSROptions['noExternal']} */ (noExternal)
}

/**
 * @param {RolldownExternal} external
 * @param {string[]} modules
 * @returns {RolldownExternal}
 */
export function mergeRolldownExternal(external, modules = []) {
  if (typeof external === "function") {
    return (source, importer, isResolved) =>
      modules.includes(source) || external(source, importer, isResolved)
  }
  const current = external === undefined
    ? []
    : Array.isArray(external)
      ? external
      : [external]
  const strings = new Set(
    current.filter((item) => typeof item === "string"),
  )
  return [
    ...current,
    ...modules.filter((module) => !strings.has(module)),
  ]
}

/**
 * @param {ViteConfigLike} config
 * @param {Alias[]} aliases
 * @returns {Alias[]}
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
