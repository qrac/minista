/**
 * @param {string[]} names
 * @returns {string}
 */
export function getPluginName(names) {
  return "vite-plugin:minista-" + names.join("-")
}

/**
 * @param {string[]} names
 * @returns {string}
 */
export function getTempName(names) {
  return "__minista_" + names.join("_")
}
