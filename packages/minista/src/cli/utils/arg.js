/**
 * @param {string[]} args
 * @returns {string}
 */
export function findRootArg(args) {
  if (!args.length) {
    return ""
  }
  const commands = /^(dev|build|optimize|preview|check|inspect|explain)$/

  if (!args[0].startsWith("-") && !args[0].match(commands)) {
    return args[0]
  }
  if (args.length >= 2 && args[0].match(commands) && !args[1].startsWith("-")) {
    return args[1]
  }
  return ""
}

/**
 * @param {string[]} args
 * @param {string} [configFile]
 * @returns {string[]}
 */
export function resolveConfigArg(args, configFile) {
  if (args.includes("--config") || args.includes("-c")) {
    return args
  }
  if (configFile) {
    return [...args, "--config", configFile]
  }
  return args
}

/**
 * @param {string[]} args
 * @returns {string[]}
 */
export function resolveSsrArg(args) {
  if (!args.length || !args.includes("build")) {
    return args
  }
  const ssrIndex = args.indexOf("--ssr")
  if (ssrIndex === -1) {
    return args
  }
  const hasSsrFile = !(args[ssrIndex + 1] || "").startsWith("-")
  return args.filter(
    (_, i) => i !== ssrIndex && !(hasSsrFile && i === ssrIndex + 1)
  )
}
