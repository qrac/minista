import { registerViteFeatureLifecycle } from "../../adapters/vite/feature-lifecycle.js"

/** @typedef {import('vite').Plugin} Plugin */
/** @typedef {import('./types').PluginOptions} PluginOptions */
/** @typedef {import('./types').UserPluginOptions} UserPluginOptions */

import path from "node:path"
import pc from "picocolors"

import { NodeArchivePublisher } from "../../adapters/archive/node.js"
import { getViteBuildSession } from "../../adapters/vite/build-session.js"
import { isViteAppClientEnvironment } from "../../adapters/vite/app-config.js"
import {
  createViteCompatibilityTraceHooks,
  processViteOutputs,
} from "../../adapters/vite/compatibility-lifecycle.js"
import { ViteEnvironmentState } from "../../adapters/vite/environment-state.js"
import { createNodeId } from "../../core/graph/index.js"
import { createArchiveFeature, createArchiveFeatureDescriptor } from "../../features/archive/index.js"
import { getRootDir } from "../../shared/path.js"

/** @type {PluginOptions} */
export const defaultOptions = {
  archives: [
    {
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
  const claimStates = new ViteEnvironmentState(() => ({
    claims: /** @type {import("../../core/graph/index.js").OutputClaim[]} */ ([]),
  }))

  return registerViteFeatureLifecycle({
    name: "vite-plugin:minista-archive",
    api: { minista: { outputClaims: /** @param {import("vite").Environment | undefined} environment */ (environment) => claimStates.get(environment).claims, feature: createArchiveFeatureDescriptor(opts) } },
    enforce: "post",
    apply(_, { command, isSsrBuild }) {
      return command === "build" && !isSsrBuild
    },
    applyToEnvironment: isViteAppClientEnvironment,
    async writeBundle(options) {
      const dist = options.dir
      if (!dist) return
      const rootDir = getRootDir(cwd, this.environment.config.root || "")
      /** @type {import("../../features/archive/index.js").ArchiveFeatureOptions} */
      const resolvedOptions = {
        archives: opts.archives.map((archive) => ({
          ...archive,
          srcDir: archive.srcDir ?? (path.relative(rootDir,
            path.resolve(rootDir, this.environment.config.build.outDir)) || "."),
        })),
      }
      const builder = new NodeArchivePublisher(rootDir, dist, resolvedOptions.archives.map(
        (archive) => path.resolve(dist, `${archive.outName}.${archive.format ?? "zip"}`),
      ))
      const outputClaims = claimStates.get(this.environment).claims
      outputClaims.length = 0
      await processViteOutputs([], [
        createArchiveFeature(resolvedOptions, builder),
      ], createViteCompatibilityTraceHooks(
        getViteBuildSession(this.environment.getTopLevelConfig()),
        "archive:build",
      ))
      const outputs = resolvedOptions.archives.map((archive) => ({
        fileName: `${archive.outName}.${archive.format ?? "zip"}`,
      }))
      const archiveByFileName = new Map(resolvedOptions.archives.map((archive) => [
        `${archive.outName}.${archive.format ?? "zip"}`,
        archive,
      ]))
      for (const output of outputs) {
        const archive = archiveByFileName.get(output.fileName)
        if (!archive) continue
        outputClaims.push(Object.freeze({
          id: createNodeId("artifact", "archive-output", output.fileName),
          kind: "archive",
          owner: createNodeId("feature", "archive"),
          source: path.relative(rootDir, path.resolve(rootDir, archive.srcDir)).replaceAll("\\", "/") || ".",
          fileName: output.fileName,
          pageUrls: Object.freeze([]),
          dependencies: Object.freeze([]),
        }))
        const finalPath = path.resolve(dist, output.fileName)
        const rel = path.relative(rootDir, path.dirname(finalPath))
        console.log(pc.gray(
          (rel + path.sep).replaceAll("\\", "/") +
            pc.green(path.basename(finalPath)),
        ))
      }
    },
  })
}
