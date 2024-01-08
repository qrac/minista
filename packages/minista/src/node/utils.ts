export function getArgs(isDeno: boolean): string[] {
  return isDeno ? (globalThis as any).Deno.args : process.argv.slice(2)
}

export function findArgsRoot(args: string[]): string {
  if (!args.length) {
    return ""
  }
  const commands = /^(dev|build|optimize|preview)$/

  if (!args[0].startsWith("-") && !args[0].match(commands)) {
    return args[0]
  }
  if (args.length >= 2 && args[0].match(commands) && !args[1].startsWith("-")) {
    return args[1]
  }
  return ""
}

export function checkArgsOneBuild(args: string[]): boolean {
  if (!args.length) {
    return false
  }
  if (args.includes("--oneBuild")) {
    return true
  }
  return false
}

export function resolveArgsConfig(
  args: string[],
  configFile?: string
): string[] {
  if (args.includes("--config") || args.includes("-c")) {
    return args
  }
  if (configFile) {
    return [...args, "--config", configFile]
  }
  return args
}

export function resolveArgsOneBuild(
  args: string[],
  isOneBuild?: boolean
): string[] {
  if (!args.length) {
    return args
  }
  if (isOneBuild) {
    const oneBuildIndex = args.indexOf("--oneBuild")
    return args.filter((_, index) => index !== oneBuildIndex)
  }
  return args
}

export function resolveArgsSsr(args: string[], isOneBuild?: boolean): string[] {
  if (!args.length || isOneBuild) {
    return args
  }
  if (args.includes("build") && args.includes("--ssr")) {
    const ssrIndex = args.indexOf("--ssr")
    const hasSsrFile = !(args[ssrIndex + 1] || "").startsWith("-")

    return args.filter((_, index) =>
      hasSsrFile
        ? index !== ssrIndex && index !== ssrIndex + 1
        : index !== ssrIndex
    )
  }
  return args
}
