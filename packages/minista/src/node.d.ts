import type { Plugin } from "vite"
import { defineConfig as defineViteConfig } from "vite"

import type { UserPluginOptions as PluginSsgOptions } from "./plugin-ssg/types"
import type { UserPluginOptions as PluginBundleOptions } from "./plugin-bundle/types"
import type { UserPluginOptions as PluginMdxOptions } from "./plugin-mdx/types"
import type { UserPluginOptions as PluginBeautifyOptions } from "./plugin-beautify"
import type { UserPluginOptions as PluginArchiveOptions } from "./plugin-archive/types"

export declare const defineConfig: typeof defineViteConfig
export declare function pluginSsg(options?: PluginSsgOptions): Plugin
export declare function pluginBundle(options?: PluginBundleOptions): Plugin
export declare function pluginMdx(options?: PluginMdxOptions): Plugin
export declare function pluginBeautify(options?: PluginBeautifyOptions): Plugin
export declare function pluginArchive(options?: PluginArchiveOptions): Plugin
