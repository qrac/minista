// @ts-check

/** @typedef {import("vite").EnvironmentOptions} EnvironmentOptions */
/** @typedef {import("vite").InlineConfig} InlineConfig */
/** @typedef {import("./app-config.js").ViteAppEnvironmentNames} ViteAppEnvironmentNames */

export const MINISTA_APP_BUILD_KEY = "__ministaAppBuild"

/** @param {unknown} config */
export function getViteAppEnvironmentNames(config) {
  if (!config || typeof config !== "object") return undefined
  const value = Reflect.get(config, MINISTA_APP_BUILD_KEY)
  if (!value || typeof value !== "object") return undefined
  const renderName = Reflect.get(value, "renderName")
  const clientName = Reflect.get(value, "clientName")
  if (typeof renderName !== "string" || typeof clientName !== "string") {
    return undefined
  }
  return /** @type {Required<ViteAppEnvironmentNames>} */ ({
    renderName,
    clientName,
  })
}

/** @param {Parameters<NonNullable<import("vite").Plugin["applyToEnvironment"]>>[0]} environment */
export function isViteAppClientEnvironment(environment) {
  const names = getViteAppEnvironmentNames(environment.getTopLevelConfig())
  return !names || environment.name === names.clientName
}

/**
 * @param {EnvironmentOptions | undefined} current
 * @param {"client" | "server"} consumer
 * @param {boolean} ssr
 * @returns {EnvironmentOptions}
 */
function createEnvironment(current, consumer, ssr) {
  return {
    ...current,
    consumer,
    build: {
      ...current?.build,
      ssr,
    },
  }
}

/**
 * Add Minista's named build environments without discarding user defaults or
 * additional environments. Environment-specific plugins must use the Vite
 * environment name instead of the root ConfigEnv.isSsrBuild compatibility flag.
 *
 * @param {InlineConfig} config
 * @param {ViteAppEnvironmentNames} [names]
 * @returns {InlineConfig}
 */
export function createViteAppConfig(config, names = {}) {
  const renderName = names.renderName ?? "render"
  const clientName = names.clientName ?? "client"
  const environments = config.environments ?? {}

  const appConfig = {
    ...config,
    builder: config.builder ?? {},
    environments: {
      ...environments,
      [renderName]: createEnvironment(
        environments[renderName],
        "server",
        true,
      ),
      [clientName]: createEnvironment(
        environments[clientName],
        "client",
        false,
      ),
    },
  }
  Reflect.set(appConfig, MINISTA_APP_BUILD_KEY, { renderName, clientName })
  return appConfig
}
