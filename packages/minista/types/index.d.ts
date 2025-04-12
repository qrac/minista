import type { Plugin } from "vite"
import { defineConfig as defineViteConfig } from "vite"

import type { UserPluginOptions as PluginSsgOptions } from "../src/plugin-ssg/types"

export declare const defineConfig: typeof defineViteConfig

export declare function pluginSsg(options?: PluginSsgOptions): Plugin
