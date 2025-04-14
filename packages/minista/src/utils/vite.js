/** @typedef {import('vite').UserConfig} UserConfig */

/**
 * @param {UserConfig} config
 * @param {string[]} modules
 * @returns {string[] | undefined}
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
