/** @typedef {import('vite').Plugin} Plugin */
/** @typedef {import('./types').PluginOptions} PluginOptions */
/** @typedef {import('./types').UserPluginOptions} UserPluginOptions */

import fs from "node:fs"
import path from "node:path"
import pc from "picocolors"

import { NodeArchiveBuilder } from "../../adapters/archive/index.js"
import { getRootDir } from "../../shared/path.js"

/** @type {PluginOptions} */
export const defaultOptions = {
  archives: [
    {
      srcDir: "dist",
      outName: "dist",
    },
  ],
}

/**
 * @param {UserPluginOptions} uOpts
 * @returns {Plugin}
 */
export function pluginArchive(uOpts = {}) {
  /** @type {PluginOptions} */
  const opts = { ...defaultOptions, ...uOpts }
  const cwd = process.cwd()

  let isDev = false
  let isSsr = false
  let isBuild = false

  let rootDir = ""
  /** @type {NodeArchiveBuilder | undefined} */
  let builder

  return {
    name: "vite-plugin:minista-archive",
    api: { minista: { feature: { id: "archive", apiVersion: 1, options: opts, provides: ["archives"], requires: ["output-files"], optionalAfter: ["beautify"] } } },
    enforce: "post",
    apply(_, { command, isSsrBuild }) {
      isDev = command === "serve"
      isSsr = command === "build" && Boolean(isSsrBuild)
      isBuild = command === "build" && !isSsrBuild
      return isBuild
    },
    config: (config) => {
      rootDir = getRootDir(cwd, config.root || "")
      builder = new NodeArchiveBuilder(rootDir)
    },
    async writeBundle(options) {
      const dist = options.dir
      if (!dist || !builder) return
      const archiveBuilder = builder

      await Promise.all(
        opts.archives.map(async (archive) => {
          const { outName } = archive
          const format = archive.format || "zip"
          const outFile = `${outName}.${format}`

          try {
            const finalPath = path.resolve(dist, outFile)
            await fs.promises.writeFile(
              finalPath,
              await archiveBuilder.build(archive),
            )

            const rel = path.relative(rootDir, path.dirname(finalPath))
            console.log(
              pc.gray(
                (rel + path.sep).replaceAll("\\", "/") +
                  pc.green(path.basename(finalPath)),
              ),
            )
          } catch (err) {
            if (err instanceof Error) {
              console.error(
                pc.red(`Error creating archive ${outName}: ${err.message}`),
              )
            } else {
              console.error(pc.red(`An unknown error occurred: ${err}`))
            }
          }
        }),
      )
    },
  }
}
