import type { Plugin, PluginBuild, OnResolveArgs } from "esbuild"
import type { Config as SvgrOptions } from "@svgr/core"

import fs from "fs-extra"
import path from "path"
import { v4 as uuidv4 } from "uuid"

import type { AliasObject, AliasArray } from "./types.js"
import { systemConfig } from "./system.js"

export function getEsbuildResolvePath(
  args: OnResolveArgs,
  alias: AliasArray
): string {
  const aliasObject = Object.assign(
    {},
    ...alias.map((item) => ({
      [item.find]: item.replacement,
    }))
  )
  function escapeRegExp(find: string) {
    return find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  }
  const aliasKeys = Object.keys(aliasObject)
  const aliasReg = new RegExp(
    `^(${aliasKeys.map((x) => escapeRegExp(x)).join("|")})`
  )
  const aliasPath = args.path.replace(aliasReg, function (match) {
    return aliasObject[match]
  })
  const absolutePath = path.isAbsolute(aliasPath)
    ? aliasPath
    : path.join(args.resolveDir, aliasPath)
  const replacedPath = absolutePath.replaceAll("\\", "/")
  return replacedPath
}

/*! Fork: esbuild-plugin-resolve | https://github.com/markwylde/esbuild-plugin-resolve */
export function resolvePlugin(alias: AliasObject): Plugin {
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
      for (const moduleName of Object.keys(alias)) {
        resolvePluginIntercept(build, moduleName, alias[moduleName])
      }
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
export function rawPlugin(alias: AliasArray): Plugin {
  return {
    name: "esbuild-raw",
    setup(build) {
      build.onResolve({ filter: /\?raw$/ }, (args) => {
        const resolvePath = getEsbuildResolvePath(args, alias)
        return {
          path: resolvePath,
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

export function partialHydrationPlugin(alias: AliasArray): Plugin {
  return {
    name: "esbuild-partial-hydration",
    setup(build) {
      build.onResolve({ filter: /\?ph$/ }, (args) => {
        const resolvePath = getEsbuildResolvePath(args, alias)
        return {
          path: resolvePath,
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
