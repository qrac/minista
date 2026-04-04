/** @typedef {import('vite').Plugin} Plugin */
/** @typedef {import('./types').PluginOptions} PluginOptions */
/** @typedef {import('./types').UserPluginOptions} UserPluginOptions */

import fs from "node:fs"
import path from "node:path"
import archiver from "archiver"
import pc from "picocolors"
import { normalizePath } from "vite"

import { getRootDir, getTempDir } from "../../shared/path.js"

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
  let tempDir = ""
  let archiveDir = ""

  return {
    name: "vite-plugin:minista-archive",
    enforce: "post",
    apply(_, { command, isSsrBuild }) {
      isDev = command === "serve"
      isSsr = command === "build" && Boolean(isSsrBuild)
      isBuild = command === "build" && !isSsrBuild
      return isBuild
    },
    config: (config) => {
      rootDir = getRootDir(cwd, config.root || "")
      tempDir = getTempDir(cwd, rootDir)
      archiveDir = path.resolve(tempDir, "archive")
    },
    async writeBundle(options) {
      const dist = options.dir
      if (!dist) return

      await fs.promises.mkdir(archiveDir, { recursive: true })
      await Promise.all(
        opts.archives.map(async (archive) => {
          const { srcDir, outName } = archive
          const ignore = archive.ignore || []
          const format = archive.format || "zip"
          const archOpts = archive.options || { zlib: { level: 9 } }
          const outFile = `${outName}.${format}`
          const archiveFile = path.resolve(archiveDir, outFile)

          try {
            await new Promise((resolve, reject) => {
              const archive = archiver(format, archOpts)
              const output = fs.createWriteStream(archiveFile)

              output.on("error", reject)
              archive.on("error", reject)
              archive.on("warning", (err) => {
                if (err.code === "ENOENT") {
                  console.warn(pc.yellow(`Archive warning: ${err.message}`))
                } else {
                  reject(err)
                }
              })
              output.on("close", () => resolve(undefined))

              archive.pipe(output)
              archive.glob(`${normalizePath(srcDir)}/**/*`, {
                cwd: rootDir,
                ignore,
              })
              archive.finalize()
            })

            const finalPath = path.resolve(dist, outFile)
            await fs.promises.copyFile(archiveFile, finalPath)

            const rel = path.relative(rootDir, path.dirname(finalPath))
            console.log(
              pc.gray(
                normalizePath(rel + path.sep) +
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
