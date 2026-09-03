import {
  findRootArg,
  resolveConfigArg,
  resolveSsrArg,
} from "./utils/arg.js"
import { findConfigFile } from "./utils/file.js"
import { runMinista } from "./utils/command.js"
import {
  createRemovedOptionDiagnostic,
  reportCliDiagnostic,
  reportCliError,
} from "./utils/diagnostic.js"
import {
  isProjectCommand,
  parseProjectCommandArgs,
  runProjectCommand,
} from "./utils/project.js"

async function main() {
  let args = process.argv.slice(2)

  if (isProjectCommand(args[0])) {
    const parsed = parseProjectCommandArgs(args)
    if (!parsed) return
    const configFile = findConfigFile(parsed.root)
    await runProjectCommand(parsed, configFile)
    return
  }

  if (args.includes("--oneBuild")) {
    reportCliDiagnostic(createRemovedOptionDiagnostic("--oneBuild"))
    process.exitCode = 1
    return
  }
  const rootArg = findRootArg(args)
  const configFile = findConfigFile(rootArg)

  args = resolveConfigArg(args, configFile)
  args = resolveSsrArg(args)

  await runMinista(args)
}

main().catch((error) => {
  reportCliError(error)
  process.exit(1)
})
