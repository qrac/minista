// @ts-check

import fs from "node:fs"
import path from "node:path"

import { createOutputManifest } from "../../core/manifest/index.js"

/** @typedef {import("vite").Rollup.RollupOutput} RollupOutput */
/** @typedef {import("./app-builder.js").ViteBuildOutput} ViteBuildOutput */

/** @param {string} base @param {string} fileName */
function resolveOutputUrl(base, fileName) {
  if (base === "" || base === "./") return fileName
  return `${base.endsWith("/") ? base : `${base}/`}${fileName}`
}

/** @param {string | Uint8Array} content */
function byteSize(content) {
  return typeof content === "string"
    ? new TextEncoder().encode(content).byteLength
    : content.byteLength
}

/** @param {ViteBuildOutput} output */
function outputItems(output) {
  return (Array.isArray(output) ? output : [output]).flatMap(
    (item) => /** @type {RollupOutput} */ (item).output,
  )
}

/**
 * @param {string} directory
 * @param {string} [prefix]
 * @returns {Promise<string[]>}
 */
async function listRelativeFiles(directory, prefix = "") {
  const entries = await fs.promises.readdir(path.resolve(directory, prefix), {
    withFileTypes: true,
  })
  const nested = await Promise.all(entries.map(async (entry) => {
    const relative = path.join(prefix, entry.name)
    return entry.isDirectory()
      ? listRelativeFiles(directory, relative)
      : entry.isFile()
        ? [relative.replaceAll("\\", "/")]
        : []
  }))
  return nested.flat()
}

/**
 * Translate Vite/Rolldown output immediately into the Core output contract.
 * Executable code, source contents, and absolute facade paths are excluded.
 *
 * @param {ViteBuildOutput} output
 * @param {{environment: string, base?: string}} options
 */
export function createViteOutputManifest(output, options) {
  const base = options.base ?? "/"
  const files = outputItems(output).map((item) => {
    if (item.type === "chunk") {
      return {
        logicalId: item.name,
        kind: /** @type {const} */ ("chunk"),
        fileName: item.fileName,
        url: resolveOutputUrl(base, item.fileName),
        byteSize: byteSize(item.code),
        isEntry: item.isEntry,
        isDynamicEntry: item.isDynamicEntry,
        imports: Object.freeze([...item.imports]),
        dynamicImports: Object.freeze([...item.dynamicImports]),
      }
    }
    return {
      logicalId: item.names[0] ?? item.fileName,
      kind: /** @type {const} */ ("asset"),
      fileName: item.fileName,
      url: resolveOutputUrl(base, item.fileName),
      byteSize: byteSize(item.source),
    }
  })
  return createOutputManifest(options.environment, files)
}

/**
 * Add files produced after generateBundle, such as archives written by a
 * finalize hook. Only relative names and byte sizes are read from disk.
 *
 * @param {import("../../core/manifest/index.js").OutputManifest} manifest
 * @param {{outDir: string, base?: string}} options
 */
export async function reconcileViteOutputManifest(manifest, options) {
  const base = options.base ?? "/"
  const known = new Set(manifest.files.map(({ fileName }) => fileName))
  /** @type {import("../../core/manifest/index.js").OutputFile[]} */
  const additional = []
  const fileNames = await listRelativeFiles(options.outDir)
  for (const fileName of fileNames) {
    if (known.has(fileName)) continue
    const stats = await fs.promises.stat(path.resolve(options.outDir, fileName))
    additional.push({
      logicalId: fileName,
      kind: "asset",
      fileName,
      url: resolveOutputUrl(base, fileName),
      byteSize: stats.size,
    })
  }
  return createOutputManifest(manifest.environment, [
    ...manifest.files,
    ...additional,
  ])
}
