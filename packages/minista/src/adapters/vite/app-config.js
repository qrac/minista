// @ts-check

/** @typedef {import("vite").EnvironmentOptions} EnvironmentOptions */
/** @typedef {import("vite").InlineConfig} InlineConfig */
/** @typedef {import("./app-config.js").ViteAppEnvironmentNames} ViteAppEnvironmentNames */

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

  return {
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
}
