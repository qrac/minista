// @ts-check

import { TarArchive, ZipArchive } from "archiver"

/** @typedef {import("../../features/archive/index.js").ArchiveOptions} ArchiveOptions */

export class NodeArchiveBuilder {
  #rootDir

  /** @param {string} rootDir */
  constructor(rootDir) {
    this.#rootDir = rootDir
  }

  /** @param {ArchiveOptions} options */
  async build(options) {
    return new Promise((resolve, reject) => {
      const archive =
        options.format === "tar"
          ? new TarArchive(options.options)
          : new ZipArchive(options.options ?? { zlib: { level: 9 } })
      /** @type {Buffer[]} */
      const chunks = []

      archive.on("data", (chunk) => chunks.push(Buffer.from(chunk)))
      archive.on("error", reject)
      archive.on("warning", (error) => {
        if (error.code !== "ENOENT") reject(error)
      })
      archive.on("end", () => resolve(new Uint8Array(Buffer.concat(chunks))))
      const ignore =
        typeof options.ignore === "string"
          ? options.ignore
          : options.ignore
            ? [...options.ignore]
            : undefined
      archive.glob(`${options.srcDir.replaceAll("\\", "/")}/**/*`, {
        cwd: this.#rootDir,
        ignore,
      })
      void archive.finalize().catch(reject)
    })
  }
}
