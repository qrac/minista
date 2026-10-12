import type { Plugin } from "vite"
import type { PluginPwaOptions } from "../../plugins/pwa/index.js"
export declare function createVitePwaPlugins(options: PluginPwaOptions): Promise<Plugin[]>
