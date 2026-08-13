// @ts-check

import fs from "node:fs"
import path from "node:path"

export class OutputWriteUnsafePathError extends Error {
  code = "MINISTA_OUTPUT_WRITE_UNSAFE_PATH"

  /** @param {string} fileName */
  constructor(fileName) {
    super(`Output file ${fileName} resolves outside the output directory.`)
    this.name = "OutputWriteUnsafePathError"
  }
}

export class NodeOutputWriter {
  /**
   * @param {string} directory
   * @param {readonly import("../../core/artifacts/index.js").EmittedFile[]} files
   */
  async write(directory, files) {
    const root = path.resolve(directory)
    const targets = files.map((file) => {
      const target = path.resolve(root, file.fileName)
      const relative = path.relative(root, target)
      if (!relative || relative.startsWith(`..${path.sep}`) ||
        relative === ".." || path.isAbsolute(relative)) {
        throw new OutputWriteUnsafePathError(file.fileName)
      }
      return { file, target }
    })
    await Promise.all(targets.map(async ({ file, target }) => {
      await fs.promises.mkdir(path.dirname(target), { recursive: true })
      await fs.promises.writeFile(target, file.content)
    }))
    return Object.freeze(targets.map(({ target }) => target))
  }
}
