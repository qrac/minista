import type { Plugin } from "vite"
import { defineConfig as defineViteConfig } from "vite"

import type { UserPluginOptions as PluginSsgOptions } from "./plugins/ssg/types"
import type { UserPluginOptions as PluginBundleOptions } from "./plugins/bundle/types"
import type { UserPluginOptions as PluginMdxOptions } from "./plugins/mdx/types"
import type { UserPluginOptions as PluginImageOptions } from "./plugins/image/types"
import type { UserPluginOptions as PluginSvgOptions } from "./plugins/svg/types"
import type { UserPluginOptions as PluginBeautifyOptions } from "./plugins/beautify"
import type { UserPluginOptions as PluginArchiveOptions } from "./plugins/archive/types"

export declare const defineConfig: typeof defineViteConfig
export declare function pluginSsg(options?: PluginSsgOptions): Plugin
export declare function pluginBundle(options?: PluginBundleOptions): Plugin
export declare function pluginMdx(options?: PluginMdxOptions): Plugin
export declare function pluginImage(options?: PluginImageOptions): Plugin
export declare function pluginSvg(options?: PluginSvgOptions): Plugin
export declare function pluginBeautify(options?: PluginBeautifyOptions): Plugin
export declare function pluginArchive(options?: PluginArchiveOptions): Plugin
