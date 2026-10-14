import type { PluginContext } from "rolldown"

export declare function resolveIslandImport(
  context: PluginContext,
  source: string,
  options: Parameters<PluginContext["resolve"]>[2],
): ReturnType<PluginContext["resolve"]>
