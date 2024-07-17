import type { Plugin } from "vite"
import fs from "node:fs"
import path from "node:path"
import archiver from "archiver"
import pc from "picocolors"

import {
  checkDeno,
  getCwd,
  getPluginName,
  getRootDir,
  getTempDir,
} from "minista-shared-utils"

import type { PluginOptions } from "./option.js"

export function pluginArchiveBuild(opts: PluginOptions): Plugin {
  const isDeno = checkDeno()
  const cwd = getCwd(isDeno)
  const names = ["archive", "build"]
  const pluginName = getPluginName(names)

  let isSsr = false
  let rootDir = ""
  let tempDir = ""
  let archiveDir = ""

  return {
    name: pluginName,
    enforce: "pre",
    apply: "build",
    config: (config) => {
      isSsr = config.build?.ssr ? true : false

      if (!isSsr) {
        rootDir = getRootDir(cwd, config.root || "")
        tempDir = getTempDir(cwd, rootDir)
        archiveDir = path.join(tempDir, "archive")
      }
    },
    async writeBundle(options, bundle) {
      if (!isSsr) {
        const dist = options.dir || ""

        if (!dist) return

        await fs.promises.mkdir(archiveDir, { recursive: true })

        await Promise.all(
          opts.items.map(async (item) => {
            const outFile = `${item.outName}.${opts.format}`
            const archiveFile = path.join(archiveDir, outFile)
            const archive = archiver(opts.format, opts.options)
            const output = fs.createWriteStream(archiveFile)

            output.on("close", async () => {
              try {
                const finalPath = path.join(dist, outFile)
                await fs.promises.copyFile(archiveFile, finalPath)

                const absoluteDist = dist.replace(rootDir + "/", "")
                console.log(pc.gray(absoluteDist + "/") + pc.green(outFile))
              } catch (err: any) {
                console.error(`Error creating archive: ${err.message}`)
              }
            })
            archive.pipe(output)
            archive.glob(item.src + "/**/*", {
              cwd: rootDir,
              ignore: item.ignore,
            })
            await archive.finalize()
          })
        )
      }
    },
  }
}
