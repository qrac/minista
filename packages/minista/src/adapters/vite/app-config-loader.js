// @ts-check

import { loadConfigFromFile, mergeConfig } from "vite"

import { createViteAppConfig } from "./app-config.js"
import { ViteApplicationContractError } from "./client-build.js"

/** @typedef {import("vite").InlineConfig} InlineConfig */
/** @typedef {import("vite").UserConfig} UserConfig */
/** @typedef {import("vite").ConfigEnv} ConfigEnv */
/** @typedef {import("./app-config.js").ViteAppEnvironmentNames} ViteAppEnvironmentNames */
/** @typedef {typeof loadConfigFromFile} ViteConfigLoader */

export class ViteAppConfigPluginMismatchError extends Error {
  code = "MINISTA_VITE_APP_CONFIG_PLUGIN_MISMATCH"

  /**
   * @param {readonly string[]} renderPlugins
   * @param {readonly string[]} clientPlugins
   */
  constructor(renderPlugins, clientPlugins) {
    super(
      "Vite plugin composition differs between legacy render and client configs.",
    )
    this.name = "ViteAppConfigPluginMismatchError"
    this.renderPlugins = Object.freeze([...renderPlugins])
    this.clientPlugins = Object.freeze([...clientPlugins])
    this.diagnostic = Object.freeze({
      code: this.code,
      severity: "warning",
      message: this.message,
      hint: "Use environment-aware plugin hooks, or keep the legacy build fallback.",
      phase: "analyze",
    })
  }
}

export class ViteAppConfigLegacyEnvironmentError extends Error {
  code = "MINISTA_VITE_APP_CONFIG_LEGACY_ENVIRONMENT"
  constructor() {
    super("The config reads isSsrBuild and must be evaluated separately for render and client.")
    this.name = "ViteAppConfigLegacyEnvironmentError"
    this.diagnostic = Object.freeze({
      code: this.code,
      severity: "warning",
      message: this.message,
      hint: "Use environment-aware plugin hooks to opt into App Build. The CLI uses the legacy builder for this config.",
      phase: "resolve",
    })
  }
}

/**
 * @param {import("vite").PluginOption} option
 * @returns {Promise<string[]>}
 */
async function collectPluginNames(option) {
  const resolved = await option
  if (!resolved) return []
  if (Array.isArray(resolved)) {
    const nested = await Promise.all(resolved.map(collectPluginNames))
    return nested.flat()
  }
  return [resolved.name || "<anonymous>"]
}

/**
 * @param {UserConfig} renderConfig
 * @param {UserConfig} clientConfig
 */
async function assertCompatiblePluginComposition(renderConfig, clientConfig) {
  const [renderPlugins, clientPlugins] = await Promise.all([
    collectPluginNames(renderConfig.plugins ?? []),
    collectPluginNames(clientConfig.plugins ?? []),
  ])
  if (
    renderPlugins.length !== clientPlugins.length ||
    renderPlugins.some((name, index) => name !== clientPlugins[index])
  ) {
    throw new ViteAppConfigPluginMismatchError(renderPlugins, clientPlugins)
  }
}

/** @param {UserConfig} config */
function projectEnvironmentOptions(config) {
  const {
    input,
    define,
    resolve,
    optimizeDeps,
    isBundled,
    dev,
    build,
  } = config
  const { alias: _alias, ...environmentResolve } = resolve ?? {}
  return {
    input,
    define,
    resolve: environmentResolve,
    optimizeDeps,
    isBundled,
    dev,
    build,
  }
}

/**
 * Evaluate a config function with the legacy render ConfigEnv and project only
 * environment-scoped options into the named render environment.
 *
 * @param {InlineConfig} config
 * @param {ViteAppEnvironmentNames} [names]
 * @param {ViteConfigLoader} [loader]
 * @returns {Promise<InlineConfig>}
 */
export async function loadViteAppConfig(
  config,
  names = {},
  loader = loadConfigFromFile,
) {
  const appConfig = createViteAppConfig(config, names)
  if (config.configFile === false || (!config.configFile && !config.root)) {
    return appConfig
  }

  /** @type {Omit<ConfigEnv, "isSsrBuild">} */
  const legacyEnvironment = {
    command: "build",
    mode: config.mode ?? "production",
    isPreview: false,
  }
  let readsLegacyEnvironment = false
  /** @param {boolean} value @returns {ConfigEnv} */
  const environment = (value) => ({
    ...legacyEnvironment,
    get isSsrBuild() {
      readsLegacyEnvironment = true
      return value
    },
  })
  const loaded = await loader(
    environment(true),
    config.configFile,
    config.root,
    config.logLevel,
    config.customLogger,
    config.configLoader,
  )
  if (!loaded) return appConfig
  const clientLoaded = await loader(
    environment(false),
    config.configFile,
    config.root,
    config.logLevel,
    config.customLogger,
    config.configLoader,
  )
  if (clientLoaded?.config.builder?.buildApp) {
    throw new ViteApplicationContractError("MINISTA_VITE_APP_BUILD_RESERVED", "Minista owns builder.buildApp. Use plugin buildApp hooks instead.")
  }
  if (clientLoaded) {
    await assertCompatiblePluginComposition(loaded.config, clientLoaded.config)
  }

  if (readsLegacyEnvironment) throw new ViteAppConfigLegacyEnvironmentError()

  const renderName = names.renderName ?? "render"
  const current = appConfig.environments?.[renderName] ?? {}
  const projected = projectEnvironmentOptions(loaded.config)
  const render = mergeConfig(projected, current)
  return {
    ...appConfig,
    environments: {
      ...appConfig.environments,
      [renderName]: render,
    },
  }
}
