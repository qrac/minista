import type { Plugin } from "vite"
import fs from "node:fs"
import path from "node:path"
import archiver from "archiver"

import { checkDeno, getCwd, getRootDir, getTempDir } from "minista-shared-utils"

import type { PluginOptions } from "./option.js"

export function pluginArchiveBuild(opts: PluginOptions): Plugin {
  const id = "__minista_archive_build"
  const isDeno = checkDeno()
  const cwd = getCwd(isDeno)

  let viteCommand: "build" | "serve"
  let isSsr = false
  let rootDir = ""
  let tempDir = ""
  let archiveDir = ""
  let archiveFile = ""

  return {
    name: "vite-plugin:minista-archive-build",
    config: (config, { command }) => {
      viteCommand = command
      isSsr = config.build?.ssr ? true : false

      if (viteCommand === "build" && !isSsr) {
        rootDir = getRootDir(cwd, config.root || "")
        tempDir = getTempDir(cwd, rootDir)
        archiveDir = path.join(tempDir, "archive")
        archiveFile = path.join(archiveDir, `${opts.outName}.${opts.format}`)
      }
    },
    async writeBundle(options, bundle) {
      if (viteCommand === "build" && !isSsr) {
        const dist = options.dir || ""

        if (!dist) return

        await fs.promises.mkdir(archiveDir, { recursive: true })

        const archive = archiver(opts.format, opts.options)
        const output = fs.createWriteStream(archiveFile)

        output.on("close", async () => {
          try {
            const finalPath = path.join(dist, `${opts.outName}.${opts.format}`)
            await fs.promises.copyFile(archiveFile, finalPath)
            console.log(`Archive created`)
          } catch (err: any) {
            console.error(`Error creating archive: ${err.message}`)
          }
        })
        archive.pipe(output)
        archive.glob("**/*", { cwd: dist, ignore: opts.ignore })
        await archive.finalize()
      }
    },
  }
}
