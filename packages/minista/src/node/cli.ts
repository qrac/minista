import { checkDeno, getCwd } from "minista-shared-utils"

import {
  getArgs,
  findArgsRoot,
  checkArgsOneBuild,
  resolveArgsConfig,
  resolveArgsOneBuild,
  resolveArgsSsr,
} from "./utils.js"
import { findConfigFile } from "./config.js"
import { runViteCommands } from "./command.js"

const isDeno = checkDeno()
const cwd = getCwd(isDeno)

let args = getArgs(isDeno)
let rootArg = ""
let configFile = ""
let isOneBuild = false

rootArg = findArgsRoot(args)
configFile = findConfigFile(cwd, rootArg)
isOneBuild = checkArgsOneBuild(args)

args = resolveArgsConfig(args, configFile)
args = resolveArgsOneBuild(args, isOneBuild)
args = resolveArgsSsr(args, isOneBuild)

await runViteCommands(args, isOneBuild)
