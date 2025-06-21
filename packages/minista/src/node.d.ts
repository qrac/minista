import type { Plugin } from "vite"
import { defineConfig as defineViteConfig } from "vite"

import type { UserPluginOptions as PluginSsgOptions } from "./plugins/ssg/types"
import type { UserPluginOptions as PluginBundleOptions } from "./plugins/bundle/types"
import type { UserPluginOptions as PluginEntryOptions } from "./plugins/entry/types"
import type { UserPluginOptions as PluginMdxOptions } from "./plugins/mdx/types"
import type { UserPluginOptions as PluginImageOptions } from "./plugins/image/types"
import type { UserPluginOptions as PluginSvgOptions } from "./plugins/svg/types"
import type { UserPluginOptions as PluginSpriteOptions } from "./plugins/sprite/types"
import type { UserPluginOptions as PluginCommentOptions } from "./plugins/comment/types"
import type { UserPluginOptions as PluginIslandOptions } from "./plugins/island"
import type { UserPluginOptions as PluginSearchOptions } from "./plugins/search/types"
import type { UserPluginOptions as PluginBeautifyOptions } from "./plugins/beautify"
import type { UserPluginOptions as PluginArchiveOptions } from "./plugins/archive/types"

export declare const defineConfig: typeof defineViteConfig
export declare function pluginSsg(options?: PluginSsgOptions): Plugin
export declare function pluginBundle(options?: PluginBundleOptions): Plugin
export declare function pluginEntry(options?: PluginEntryOptions): Plugin
export declare function pluginMdx(options?: PluginMdxOptions): Plugin
export declare function pluginImage(options?: PluginImageOptions): Plugin
export declare function pluginSvg(options?: PluginSvgOptions): Plugin
export declare function pluginSprite(options?: PluginSpriteOptions): Plugin
export declare function pluginComment(options?: PluginCommentOptions): Plugin
export declare function pluginIsland(options?: PluginIslandOptions): Plugin
export declare function pluginSearch(options?: PluginSearchOptions): Plugin
export declare function pluginBeautify(options?: PluginBeautifyOptions): Plugin
export declare function pluginArchive(options?: PluginArchiveOptions): Plugin
