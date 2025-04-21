import type { Plugin } from "vite"
import { defineConfig as defineViteConfig } from "vite"

import type { UserPluginOptions as PluginSsgOptions } from "../src/plugin-ssg/types"
import type { UserPluginOptions as PluginBundleOptions } from "../src/plugin-bundle/types"
import type { UserPluginOptions as PluginBeautifyOptions } from "../src/plugin-beautify"

export declare const defineConfig: typeof defineViteConfig
export declare function pluginSsg(options?: PluginSsgOptions): Plugin
export declare function pluginBundle(options?: PluginBundleOptions): Plugin
export declare function pluginBeautify(options?: PluginBeautifyOptions): Plugin
