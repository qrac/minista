import path from "node:path"
import fs from "fs-extra"
import archiver from "archiver"

import type { ResolvedConfig } from "../config/index.js"
import { logger } from "../cli/logger.js"
import { getSpace } from "../utility/space.js"

export async function generateArchives({
  config,
  maxNameLength,
}: {
  config: ResolvedConfig
  maxNameLength?: number
}) {
  const { resolvedRoot, tempDir } = config.sub
  const { archives } = config.main.delivery

  if (!archives.length) {
    return
  }
  const cwd = path.relative(process.cwd(), resolvedRoot)
  const archivesDir = path.join(tempDir, "archives")

  await fs.emptyDir(archivesDir)

  await Promise.all(
    archives.map(async (item) => {
      const srcDir = item.srcDir
      const outFile = item.outName + "." + item.format
      const fileName = path.join(item.outDir, outFile)
      const archiveFile = path.join(archivesDir, fileName)

      await fs.ensureFile(archiveFile)
      const output = fs.createWriteStream(archiveFile)
      const options = item.options ? item.options : {}
      const ignore = item.ignore ? item.ignore : ""
      const archive = archiver(item.format, options)

      output.on("close", async () => {
        const space = getSpace({
          nameLength: fileName.length,
          maxNameLength,
          min: 3,
        })
        const routePath = path.join(resolvedRoot, config.main.out, fileName)
        const relativePath = path.relative(process.cwd(), routePath)
        const dataLength = archive.pointer()

        await fs
          .copy(archiveFile, routePath)
          .then(() => {
            logger({ label: "BUILD", main: relativePath, space, dataLength })
          })
          .catch((err) => {
            console.error(err)
          })
        return
      })

      archive.pipe(output)
      archive.glob(path.join(srcDir, "**/*"), { cwd, ignore })

      await archive.finalize()
      return
    })
  )
}
