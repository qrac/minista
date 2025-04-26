import {
  findRootArg,
  checkOneBuildArg,
  resolveConfigArg,
  resolveOneBuildArg,
  resolveSsrArg,
} from "./utils/arg.js"
import { findConfigFile } from "./utils/file.js"
import { runMinista } from "./utils/command.js"

async function main() {
  let args = process.argv.slice(2)

  const rootArg = findRootArg(args)
  const isOneBuild = checkOneBuildArg(args)
  const configFile = findConfigFile(rootArg)

  args = resolveConfigArg(args, configFile)
  args = resolveOneBuildArg(args, isOneBuild)
  args = resolveSsrArg(args, isOneBuild)

  await runMinista(args, isOneBuild)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
