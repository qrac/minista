import type { Plugin } from "vite"

import { pluginEntryBuild } from "./build.js"

export function pluginEntry(): Plugin[] {
  return [pluginEntryBuild()]
}
