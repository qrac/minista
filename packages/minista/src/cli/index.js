import {
  findRootArg,
  checkOneBuildArg,
  resolveConfigArg,
  resolveOneBuildArg,
  resolveSsrArg,
} from "./arg.js"
import { existsConfigFile } from "./file.js"
import { runMinista } from "./command.js"

async function main() {
  let args = process.argv.slice(2)

  const rootArg = findRootArg(args)
  const isOneBuild = checkOneBuildArg(args)
  const configFile = existsConfigFile(rootArg)

  args = resolveConfigArg(args, configFile)
  args = resolveOneBuildArg(args, isOneBuild)
  args = resolveSsrArg(args, isOneBuild)

  await runMinista(args, isOneBuild)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
