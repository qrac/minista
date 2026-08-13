// @ts-check

import { loadConfigFromFile, mergeConfig } from "vite"

import { createViteAppConfig } from "./app-config.js"

/** @typedef {import("vite").InlineConfig} InlineConfig */
/** @typedef {import("vite").UserConfig} UserConfig */
/** @typedef {import("vite").ConfigEnv} ConfigEnv */
/** @typedef {import("./app-config.js").ViteAppEnvironmentNames} ViteAppEnvironmentNames */
/** @typedef {typeof loadConfigFromFile} ViteConfigLoader */

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
  const loaded = await loader(
    { ...legacyEnvironment, isSsrBuild: true },
    config.configFile,
    config.root,
    config.logLevel,
    config.customLogger,
    config.configLoader,
  )
  if (!loaded) return appConfig

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
