/** @typedef {import('vite').Plugin} Plugin */
/** @typedef {import('./types').PluginOptions} PluginOptions */

import fs from "node:fs"
import path from "node:path"
import archiver from "archiver"
import pc from "picocolors"
import { normalizePath } from "vite"

import { getPluginName } from "../../shared/name.js"
import { getRootDir, getTempDir } from "../../shared/path.js"

/**
 * @param {PluginOptions} opts
 * @returns {Plugin}
 */
export function pluginArchiveBuild(opts) {
  const cwd = process.cwd()
  const names = ["archive", "build"]
  const pluginName = getPluginName(names)

  let isSsr = false
  let rootDir = ""
  let tempDir = ""
  let archiveDir = ""

  return {
    name: pluginName,
    enforce: "post",
    apply: "build",
    config: (config) => {
      isSsr = !!config.build?.ssr
      rootDir = getRootDir(cwd, config.root || "")
      tempDir = getTempDir(cwd, rootDir)
      archiveDir = path.resolve(tempDir, "archive")
    },
    async writeBundle(options) {
      if (isSsr) return

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
              output.on("close", () => resolve())

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
                  pc.green(path.basename(finalPath))
              )
            )
          } catch (err) {
            console.error(
              pc.red(`Error creating archive ${outName}: ${err.message}`)
            )
          }
        })
      )
    },
  }
}
