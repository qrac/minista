import type { Plugin } from "vite"

/** Options forwarded to vite-plugin-pwa. Install the optional peer to use PWA. */
export interface PluginPwaOptions {
  registerType?: "prompt" | "autoUpdate"
  injectRegister?: "auto" | "inline" | "script" | "script-defer" | false | null
  manifest?: false | { [key: string]: unknown }
  manifestFilename?: string
  filename?: string
  scope?: string
  base?: string
  disable?: boolean
  workbox?: { [key: string]: unknown }
  includeAssets?: string | string[]
  useCredentials?: boolean
}
export declare function pluginPwa(options?: PluginPwaOptions): Promise<Plugin[]>
