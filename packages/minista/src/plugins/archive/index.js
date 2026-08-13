/** @typedef {import('vite').Plugin} Plugin */
/** @typedef {import('./types').PluginOptions} PluginOptions */
/** @typedef {import('./types').UserPluginOptions} UserPluginOptions */

import path from "node:path"
import pc from "picocolors"

import { NodeArchiveBuilder } from "../../adapters/archive/index.js"
import { NodeOutputWriter } from "../../adapters/filesystem/output-writer.js"
import { isViteAppClientEnvironment } from "../../adapters/vite/app-config.js"
import { processViteOutputs } from "../../adapters/vite/compatibility-lifecycle.js"
import { ViteEnvironmentState } from "../../adapters/vite/environment-state.js"
import { createNodeId } from "../../core/graph/index.js"
import { createArchiveFeature } from "../../features/archive/index.js"
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
  const claimStates = new ViteEnvironmentState(() => ({
    claims: /** @type {import("../../core/graph/index.js").OutputClaim[]} */ ([]),
  }))
  const outputWriter = new NodeOutputWriter()

  return {
    name: "vite-plugin:minista-archive",
    api: { minista: { outputClaims: /** @param {import("vite").Environment | undefined} environment */ (environment) => claimStates.get(environment).claims, feature: { id: "archive", apiVersion: 1, options: opts, provides: ["archives"], requires: ["output-files"], optionalAfter: ["beautify"] } } },
    enforce: "post",
    apply(_, { command, isSsrBuild }) {
      isDev = command === "serve"
      isSsr = command === "build" && Boolean(isSsrBuild)
      isBuild = command === "build" && !isSsrBuild
      return isBuild
    },
    applyToEnvironment: isViteAppClientEnvironment,
    config: (config) => {
      rootDir = getRootDir(cwd, config.root || "")
      builder = new NodeArchiveBuilder(rootDir)
    },
    async writeBundle(options) {
      const dist = options.dir
      if (!dist || !builder) return
      const outputClaims = claimStates.get(this.environment).claims
      outputClaims.length = 0
      const outputs = await processViteOutputs([], [
        createArchiveFeature(opts, builder),
      ])
      const paths = await outputWriter.write(dist, outputs)
      const archiveByFileName = new Map(opts.archives.map((archive) => [
        `${archive.outName}.${archive.format ?? "zip"}`,
        archive,
      ]))
      for (const [index, output] of outputs.entries()) {
        const archive = archiveByFileName.get(output.fileName)
        if (!archive) continue
        outputClaims.push(Object.freeze({
          id: createNodeId("artifact", "archive-output", output.fileName),
          kind: "archive",
          owner: createNodeId("feature", "archive"),
          source: archive.srcDir,
          fileName: output.fileName,
          pageUrls: Object.freeze([]),
          dependencies: Object.freeze([]),
        }))
        const finalPath = paths[index]
        const rel = path.relative(rootDir, path.dirname(finalPath))
        console.log(pc.gray(
          (rel + path.sep).replaceAll("\\", "/") +
            pc.green(path.basename(finalPath)),
        ))
      }
    },
  }
}
