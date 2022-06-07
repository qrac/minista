import type { Plugin, PluginBuild } from "esbuild"
import type { Config as SvgrOptions } from "@svgr/core"

import fs from "fs-extra"
import path from "path"
import { v4 as uuidv4 } from "uuid"

import type { MinistaResolveAlias } from "./types.js"
import { systemConfig } from "./system.js"

export function getEsbuildAlias(aliasArray: MinistaResolveAlias[]) {
  const alias = [...aliasArray].flat()
  const result: { [key: string]: string } = Object.assign(
    {},
    ...alias.map((item) => ({
      [item.find]: item.replacement,
    }))
  )
  return result
}

/*! Fork: esbuild-plugin-resolve | https://github.com/markwylde/esbuild-plugin-resolve */
export function resolvePlugin(options: { [key: string]: string }): Plugin {
  function resolvePluginIntercept(
    build: PluginBuild,
    moduleName: string,
    moduleTarget: string
  ) {
    const filter = new RegExp("^" + moduleName + "(?:\\/.*)?$")
    build.onResolve({ filter }, async (args) => {
      if (args.resolveDir === "") {
        return
      }
      return {
        path: args.path,
        namespace: "esbuild-resolve",
        pluginData: {
          resolveDir: args.resolveDir,
          moduleName,
        },
      }
    })
    build.onLoad({ filter, namespace: "esbuild-resolve" }, async (args) => {
      const importerCode = `
        export * from '${args.path.replace(
          args.pluginData.moduleName,
          moduleTarget
        )}';
        export { default } from '${args.path.replace(
          args.pluginData.moduleName,
          moduleTarget
        )}';
      `
      return { contents: importerCode, resolveDir: args.pluginData.resolveDir }
    })
  }
  return {
    name: "esbuild-resolve",
    setup: (build: PluginBuild) => {
      for (const moduleName of Object.keys(options)) {
        resolvePluginIntercept(build, moduleName, options[moduleName])
      }
    },
  }
}

/*! Fork: esbuild-plugin-alias | https://github.com/igoradamenko/esbuild-plugin-alias */
export function aliasPlugin(options: { [key: string]: string }): Plugin {
  function escapeRegExp(name: string) {
    return name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  }
  const aliases = Object.keys(options)
  const re = new RegExp(`^(${aliases.map((x) => escapeRegExp(x)).join("|")})$`)

  return {
    name: "esbuild-alias",
    setup(build) {
      build.onResolve({ filter: re }, (args) => ({
        path: options[args.path],
      }))
    },
  }
}

/*! Fork: esbuild-plugin-svgr | https://github.com/kazijawad/esbuild-plugin-svgr */
export function svgrPlugin(options: SvgrOptions): Plugin {
  return {
    name: "esbuild-svgr",
    setup(build) {
      build.onLoad({ filter: /\.svg$/ }, async (args) => {
        const { transform: transformSvgr } = await import("@svgr/core")
        const svg = await fs.readFile(args.path, "utf8")
        const contents = await transformSvgr(
          svg,
          { ...options },
          { filePath: args.path }
        )
        return {
          contents,
          loader: options.typescript ? "tsx" : "jsx",
        }
      })
    },
  }
}

/*! Fork: esbuild-plugin-resolve | https://github.com/hannoeru/esbuild-plugin-raw */
export function rawPlugin(): Plugin {
  return {
    name: "esbuild-raw",
    setup(build) {
      build.onResolve({ filter: /\?raw$/ }, (args) => {
        return {
          path: path.isAbsolute(args.path)
            ? args.path
            : path.join(args.resolveDir, args.path),
          namespace: "raw-loader",
        }
      })
      build.onLoad(
        { filter: /\?raw$/, namespace: "raw-loader" },
        async (args) => {
          return {
            contents: await fs.readFile(args.path.replace(/\?raw$/, "")),
            loader: "text",
          }
        }
      )
    },
  }
}

export function partialHydrationPlugin(): Plugin {
  return {
    name: "esbuild-partial-hydration",
    setup(build) {
      build.onResolve({ filter: /\?ph$/ }, (args) => {
        return {
          path: (path.isAbsolute(args.path)
            ? args.path
            : path.join(args.resolveDir, args.path)
          ).replaceAll("\\", "/"),
          namespace: "partial-hydration-loader",
        }
      })
      build.onLoad(
        { filter: /\?ph$/, namespace: "partial-hydration-loader" },
        async (args) => {
          const jsPath = args.path.replace(/\?ph$/, "")
          const uniqueId = uuidv4()
          const underUniqueId = uniqueId.replace(/-/g, "_")
          const outDir = systemConfig.temp.partialHydration.outDir
          const outFile = `${outDir}/modules/${underUniqueId}.txt`
          const template = `${jsPath}`

          await fs.outputFile(outFile, template).catch((err) => {
            console.error(err)
          })
          const dummy = `export default () => <div data-partial-hydration="${underUniqueId}"></div>`
          return {
            contents: dummy,
            loader: "tsx",
          }
        }
      )
    },
  }
}
