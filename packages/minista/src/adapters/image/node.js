// @ts-check

import fs from "node:fs"
import path from "node:path"

import { createNodeId } from "../../core/graph/index.js"
import { getPatternAttrs, getPatternMap } from "../../plugins/image/utils/pattern.js"
import { getRatio } from "../../plugins/image/utils/ratio.js"
import { getRemote } from "../../plugins/image/utils/remote.js"
import { resolveOptimizeOption } from "../../plugins/image/utils/option.js"
import { runSharp } from "../../plugins/image/utils/sharp.js"
import { getSize } from "../../plugins/image/utils/size.js"
import { getView } from "../../plugins/image/utils/view.js"

/** @typedef {import("../../features/image/index.js").GeneratedImageArtifact} GeneratedImageArtifact */
/** @typedef {import("../../features/image/index.js").GeneratedImagePlan} GeneratedImagePlan */
/** @typedef {import("../../features/image/index.js").ImageFeatureOptions} ImageFeatureOptions */
/** @typedef {import("../../features/image/index.js").ImageReference} ImageReference */
/** @typedef {import("../../plugins/image/types.js").ImageOptimize} ImageOptimize */
/** @typedef {import("../../plugins/image/types.js").ImagePattern} ImagePattern */
/** @typedef {import("../../plugins/image/types.js").ImageRecipe} ImageRecipe */

/** @param {string} format */
function mediaType(format) {
  return format === "jpg" ? "image/jpeg" : `image/${format}`
}

export class NodeImageGenerator {
  #rootDir
  #cacheDir

  /**
   * @param {string} rootDir
   * @param {string} cacheDir
   */
  constructor(rootDir, cacheDir) {
    this.#rootDir = rootDir
    this.#cacheDir = cacheDir
  }

  /**
   * @param {readonly ImageReference[]} references
   * @param {ImageFeatureOptions} options
   */
  async generate(references, options) {
    await fs.promises.mkdir(this.#cacheDir, { recursive: true })
    const remoteSources = [
      ...new Set(
        references
          .map(({ source }) => source)
          .filter((source) => source.startsWith("http")),
      ),
    ].sort()
    /** @type {Map<string, string>} */
    const sourceFiles = new Map()

    for (const reference of references) {
      if (!reference.source.startsWith("http")) {
        sourceFiles.set(
          reference.source,
          path.resolve(this.#rootDir, reference.source.replace(/^\//, "")),
        )
      }
    }
    for (const [index, source] of remoteSources.entries()) {
      const downloaded = await getRemote(source, "__r", index + 1)
      if (!downloaded) continue
      const file = path.resolve(this.#cacheDir, downloaded.fileName)
      await fs.promises.writeFile(file, downloaded.data)
      sourceFiles.set(source, file)
    }

    /** @type {Map<string, ImageRecipe>} */
    const recipes = new Map()
    for (const [source, fileName] of sourceFiles) {
      if (!fs.existsSync(fileName)) continue
      const { width, height } = await getSize(fileName)
      recipes.set(source, {
        fileName: source.startsWith("http")
          ? path.basename(fileName)
          : source.replace(/^\//, ""),
        width,
        height,
        ratioWidth: getRatio(width, height),
        ratioHeight: getRatio(height, width),
        patternMap: {},
        usedPatternMap: {},
      })
    }

    /** @type {Map<string, GeneratedImageArtifact>} */
    const artifacts = new Map()
    /** @type {GeneratedImagePlan[]} */
    const plans = []

    for (const reference of references) {
      const recipe = recipes.get(reference.source)
      const inputFile = sourceFiles.get(reference.source)
      if (!recipe || !inputFile) continue
      const optimize = resolveOptimizeOption(
        /** @type {ImageOptimize} */ ({
          ...options.optimize,
          ...reference.optimize,
        }),
        recipe,
      )
      const view = getView(optimize, recipe, reference)
      const patternMap = getPatternMap(optimize, recipe, view, false)
      const attrs = getPatternAttrs(optimize, recipe, view, false)

      for (const pattern of Object.values(patternMap)) {
        const id = createNodeId("artifact", `image/${pattern.fileName}`)
        if (artifacts.has(id)) continue
        const cacheFile = path.resolve(this.#cacheDir, pattern.fileName)
        let content
        if (options.useCache && fs.existsSync(cacheFile)) {
          content = await fs.promises.readFile(cacheFile)
        } else {
          content = await runSharp(inputFile, /** @type {ImagePattern} */ (pattern))
          if (options.useCache) {
            await fs.promises.mkdir(path.dirname(cacheFile), { recursive: true })
            await fs.promises.writeFile(cacheFile, content)
          }
        }
        artifacts.set(
          id,
          Object.freeze({
            id,
            source: reference.source,
            fileName: pattern.fileName,
            mediaType: mediaType(String(pattern.format)),
            content: new Uint8Array(content),
          }),
        )
      }

      const artifactByFileName = new Map(
        [...artifacts.values()]
          .filter(({ source }) => source === reference.source)
          .map((artifact) => [artifact.fileName, artifact.id]),
      )
      const src = artifactByFileName.get(attrs.src)
      const srcset = Object.entries(attrs.srcset).flatMap(
        ([descriptor, fileName]) => {
          const artifactId = artifactByFileName.get(fileName)
          return artifactId ? [{ descriptor, artifactId }] : []
        },
      )
      if (!src || srcset.length === 0) continue
      plans.push(
        Object.freeze({
          key: reference.key,
          src,
          srcset: Object.freeze(srcset),
          sizes: view.sizes,
          width: view.width,
          height: view.height,
        }),
      )
    }

    return Object.freeze({
      artifacts: Object.freeze([...artifacts.values()]),
      plans: Object.freeze(plans),
    })
  }
}
