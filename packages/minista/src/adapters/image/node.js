// @ts-check

import fs from "node:fs"
import path from "node:path"
import { randomUUID } from "node:crypto"

import { createNodeId, toProjectPath } from "../../core/graph/index.js"
import { generateHash } from "../../plugins/image/utils/hash.js"
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

const imageErrorCodes = Object.freeze({
  download: "MINISTA_IMAGE_DOWNLOAD_FAILED",
  read: "MINISTA_IMAGE_READ_FAILED",
  metadata: "MINISTA_IMAGE_METADATA_FAILED",
  transform: "MINISTA_IMAGE_TRANSFORM_FAILED",
  cache: "MINISTA_IMAGE_CACHE_FAILED",
})

/** @param {string} rootDir @param {string} source */
function imageLocation(rootDir, source) {
  if (/^https?:\/\//.test(source)) return undefined
  const cleanSource = source.split(/[?#]/, 1)[0] ?? ""
  const absoluteRoot = path.resolve(rootDir)
  const absoluteFile = path.isAbsolute(cleanSource)
    ? path.resolve(absoluteRoot, cleanSource.replace(/^[/\\]+/, ""))
    : path.resolve(absoluteRoot, cleanSource)
  const relativeFile = path.relative(absoluteRoot, absoluteFile)
  if (
    !relativeFile || relativeFile === ".." ||
    relativeFile.startsWith(`..${path.sep}`)
  ) {
    return undefined
  }
  return Object.freeze({ file: toProjectPath(relativeFile) })
}

/** @param {string} source @param {ReturnType<typeof imageLocation>} location */
function displayImageSource(source, location) {
  if (location) return location.file
  if (/^https?:\/\//.test(source)) {
    try {
      const url = new URL(source)
      return `${url.origin}${url.pathname}`
    } catch {
      return "remote image"
    }
  }
  return path.basename(source) || "image source"
}

export class NodeImageError extends Error {
  /**
   * @param {unknown} cause
   * @param {import("./node.js").NodeImageErrorOptions} options
   */
  constructor(cause, options) {
    const detail = cause instanceof Error ? cause.message : String(cause)
    const location = imageLocation(options.rootDir, options.source)
    const displaySource = displayImageSource(options.source, location)
    const message = `Image ${options.operation} failed for ${displaySource}: ${detail}`
    super(message, cause instanceof Error ? { cause } : undefined)
    this.name = "NodeImageError"
    this.code = imageErrorCodes[options.operation]
    this.operation = options.operation
    this.source = options.source
    this.diagnostic = Object.freeze({
      code: this.code,
      severity: "error",
      message,
      hint: "Check the image source, format, optimization options, and cache permissions.",
      phase: "generate",
      feature: "feature:image",
      ...(location ? { location } : {}),
    })
  }
}

/**
 * @template Result
 * @param {import("./node.js").NodeImageOperation} operation
 * @param {string} rootDir
 * @param {string} source
 * @param {() => Promise<Result>} task
 */
async function runImageOperation(operation, rootDir, source, task) {
  try {
    return await task()
  } catch (error) {
    if (
      error instanceof Error &&
      typeof Reflect.get(error, "code") === "string" &&
      Reflect.get(error, "code").startsWith("MINISTA_")
    ) {
      throw error
    }
    throw new NodeImageError(error, { operation, rootDir, source })
  }
}

/** @param {string} format */
function mediaType(format) {
  return format === "jpg" ? "image/jpeg" : `image/${format}`
}

export class NodeImageGenerator {
  #rootDir
  #cacheDir
  #resizeOnly

  /**
   * @param {string} rootDir
   * @param {string} cacheDir
   * @param {boolean} [resizeOnly]
   */
  constructor(rootDir, cacheDir, resizeOnly = false) {
    this.#rootDir = rootDir
    this.#cacheDir = cacheDir
    this.#resizeOnly = resizeOnly
  }

  /**
   * @param {readonly ImageReference[]} references
   * @param {ImageFeatureOptions} options
   */
  async generate(references, options) {
    await runImageOperation("cache", this.#rootDir, "", () =>
      fs.promises.mkdir(this.#cacheDir, { recursive: true })
    )
    const cacheManifestFile = path.resolve(this.#cacheDir, "cache.json")
    /** @type {{ version: 1, artifacts: Record<string, string> }} */
    let cacheManifest = { version: 1, artifacts: {} }
    if (options.useCache && fs.existsSync(cacheManifestFile)) {
      try {
        const parsed = JSON.parse(
          await fs.promises.readFile(cacheManifestFile, "utf8"),
        )
        if (parsed?.version === 1 && parsed.artifacts) cacheManifest = parsed
      } catch {
        // An unreadable or legacy cache is treated as empty.
      }
    }
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
      const downloaded = await runImageOperation(
        "download",
        this.#rootDir,
        source,
        () => getRemote(source, "__r", index + 1),
      )
      const file = path.resolve(this.#cacheDir, downloaded.fileName)
      await runImageOperation("cache", this.#rootDir, source, () =>
        fs.promises.writeFile(file, downloaded.data)
      )
      sourceFiles.set(source, file)
    }

    /** @type {Map<string, ImageRecipe>} */
    const recipes = new Map()
    /** @type {Map<string, string>} */
    const sourceHashes = new Map()
    for (const [source, fileName] of sourceFiles) {
      if (!fs.existsSync(fileName)) {
        throw new NodeImageError(
          new Error("Image source does not exist."),
          { operation: "read", rootDir: this.#rootDir, source },
        )
      }
      const sourceContent = await runImageOperation(
        "read",
        this.#rootDir,
        source,
        () => fs.promises.readFile(fileName),
      )
      sourceHashes.set(source, generateHash(sourceContent))
      const { width, height } = await runImageOperation(
        "metadata",
        this.#rootDir,
        source,
        () => getSize(fileName),
      )
      if (width <= 0 || height <= 0) {
        throw new NodeImageError(
          new Error("Image dimensions could not be determined."),
          { operation: "metadata", rootDir: this.#rootDir, source },
        )
      }
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
      const patternMap = getPatternMap(
        optimize,
        recipe,
        view,
        this.#resizeOnly,
      )
      const attrs = getPatternAttrs(
        optimize,
        recipe,
        view,
        this.#resizeOnly,
      )

      for (const pattern of Object.values(patternMap)) {
        const id = createNodeId("artifact", `image/${pattern.fileName}`)
        if (artifacts.has(id)) continue
        const cacheFile = path.resolve(this.#cacheDir, pattern.fileName)
        const cacheKey = generateHash(
          `${sourceHashes.get(reference.source)}:${JSON.stringify(pattern)}`,
        )
        /** @type {Buffer} */
        let content
        if (
          options.useCache &&
          cacheManifest.artifacts[pattern.fileName] === cacheKey &&
          fs.existsSync(cacheFile)
        ) {
          content = await runImageOperation(
            "cache",
            this.#rootDir,
            reference.source,
            () => fs.promises.readFile(cacheFile),
          )
        } else {
          content = await runImageOperation(
            "transform",
            this.#rootDir,
            reference.source,
            () => runSharp(
              inputFile,
              /** @type {ImagePattern} */ (pattern),
            ),
          )
          if (options.useCache) {
            await runImageOperation(
              "cache",
              this.#rootDir,
              reference.source,
              async () => {
                await fs.promises.mkdir(path.dirname(cacheFile), {
                  recursive: true,
                })
                await fs.promises.writeFile(cacheFile, content)
              },
            )
          }
        }
        if (options.useCache) {
          cacheManifest.artifacts[pattern.fileName] = cacheKey
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

    if (options.useCache) {
      const pendingFile = `${cacheManifestFile}.${process.pid}.${randomUUID()}.tmp`
      await runImageOperation("cache", this.#rootDir, "", async () => {
        await fs.promises.writeFile(
          pendingFile,
          JSON.stringify(cacheManifest, null, 2),
          "utf8",
        )
        await fs.promises.rename(pendingFile, cacheManifestFile)
      })
    }

    return Object.freeze({
      artifacts: Object.freeze([...artifacts.values()]),
      plans: Object.freeze(plans),
    })
  }
}
