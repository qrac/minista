// @ts-check

import fs from "node:fs"
import os from "node:os"
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

/** @typedef {{width: number, height: number}} CachedImageMetadata */
/** @typedef {{index: number, fileName: string, fetchedAt: number, hash?: string, width?: number, height?: number, etag?: string, lastModified?: string}} CachedRemoteSource */
/** @typedef {{version: 2, artifacts: Record<string, string>, metadata: Record<string, CachedImageMetadata>, remoteSources: Record<string, CachedRemoteSource>, nextRemoteIndex: number}} ImageCacheManifest */

const imageConcurrency = Math.max(
  1,
  Math.min(4, typeof os.availableParallelism === "function"
    ? os.availableParallelism()
    : os.cpus().length),
)

/**
 * @template Input, Output
 * @param {readonly Input[]} items
 * @param {number} concurrency
 * @param {(item: Input, index: number) => Promise<Output>} task
 * @returns {Promise<Output[]>}
 */
async function mapConcurrent(items, concurrency, task) {
  /** @type {Output[]} */
  const results = new Array(items.length)
  let nextIndex = 0
  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex
      nextIndex += 1
      results[index] = await task(items[index], index)
    }
  }
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker(),
  )
  await Promise.all(workers)
  return results
}

/** @param {unknown} value @returns {value is Record<string, unknown>} */
function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

/** @param {string} fileName */
function isSafeCachePath(fileName) {
  if (!fileName || path.isAbsolute(fileName)) return false
  const normalized = path.normalize(fileName)
  return normalized !== ".." && !normalized.startsWith(`..${path.sep}`)
}

/** @param {unknown} parsed @returns {ImageCacheManifest} */
function normalizeCacheManifest(parsed) {
  const value = isRecord(parsed) ? parsed : {}
  /** @type {Record<string, string>} */
  const artifacts = {}
  for (const [fileName, hash] of Object.entries(
    isRecord(value.artifacts) ? value.artifacts : {},
  )) {
    if (typeof hash === "string") artifacts[fileName] = hash
  }
  if (value.version !== 2) {
    return {
      version: 2,
      artifacts,
      metadata: {},
      remoteSources: {},
      nextRemoteIndex: 1,
    }
  }
  /** @type {Record<string, CachedImageMetadata>} */
  const metadata = {}
  for (const [hash, item] of Object.entries(
    isRecord(value.metadata) ? value.metadata : {},
  )) {
    if (
      isRecord(item) && typeof item.width === "number" && item.width > 0 &&
      typeof item.height === "number" && item.height > 0
    ) {
      metadata[hash] = { width: item.width, height: item.height }
    }
  }
  /** @type {Record<string, CachedRemoteSource>} */
  const remoteSources = {}
  for (const [key, item] of Object.entries(
    isRecord(value.remoteSources) ? value.remoteSources : {},
  )) {
    if (
      isRecord(item) && typeof item.index === "number" &&
      Number.isSafeInteger(item.index) && item.index > 0 &&
      typeof item.fileName === "string" && isSafeCachePath(item.fileName) &&
      typeof item.fetchedAt === "number" && Number.isFinite(item.fetchedAt)
    ) {
      remoteSources[key] = {
        index: item.index,
        fileName: item.fileName,
        fetchedAt: item.fetchedAt,
        ...(typeof item.hash === "string" ? { hash: item.hash } : {}),
        ...(typeof item.width === "number" && item.width > 0
          ? { width: item.width }
          : {}),
        ...(typeof item.height === "number" && item.height > 0
          ? { height: item.height }
          : {}),
        ...(typeof item.etag === "string" ? { etag: item.etag } : {}),
        ...(typeof item.lastModified === "string"
          ? { lastModified: item.lastModified }
          : {}),
      }
    }
  }
  const nextRemoteIndex = Math.max(
    typeof value.nextRemoteIndex === "number" &&
        Number.isSafeInteger(value.nextRemoteIndex) && value.nextRemoteIndex > 0
      ? value.nextRemoteIndex
      : 1,
    ...Object.values(remoteSources).map(({ index }) => index + 1),
  )
  return {
    version: 2,
    artifacts,
    metadata,
    remoteSources,
    nextRemoteIndex,
  }
}

/**
 * @param {CachedRemoteSource | undefined} cached
 * @param {ImageFeatureOptions["remoteCache"]} policy
 */
function canReuseRemote(cached, policy) {
  if (!cached) return false
  if (policy === "immutable" || policy === undefined) return true
  const maxAge = Math.max(0, Number(policy.maxAge) || 0)
  return Date.now() - cached.fetchedAt <= maxAge
}

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
    /** @type {ImageCacheManifest} */
    let cacheManifest = normalizeCacheManifest(undefined)
    if (options.useCache && fs.existsSync(cacheManifestFile)) {
      try {
        cacheManifest = normalizeCacheManifest(JSON.parse(
          await fs.promises.readFile(cacheManifestFile, "utf8"),
        ))
      } catch {
        // An unreadable cache is treated as empty. v1 artifact hashes migrate.
      }
    }
    const remoteSources = [
      ...new Set(
        references
          .map(({ source }) => source)
          .filter((source) => source.startsWith("http")),
      ),
    ].sort()
    const remotePlans = remoteSources.map((source, position) => {
      const key = generateHash(source)
      const stored = options.useCache
        ? cacheManifest.remoteSources[key]
        : undefined
      const cachedFile = stored
        ? path.resolve(this.#cacheDir, stored.fileName)
        : undefined
      const available = Boolean(cachedFile && fs.existsSync(cachedFile))
      const index = stored
        ? stored.index
        : options.useCache
        ? cacheManifest.nextRemoteIndex++
        : position + 1
      return { source, key, cached: available ? stored : undefined, index }
    })
    const downloadedSources = await mapConcurrent(
      remotePlans,
      imageConcurrency,
      async ({ source, key, cached, index }) => {
        if (
          options.useCache && cached &&
          canReuseRemote(cached, options.remoteCache)
        ) {
          return {
            source,
            key,
            file: path.resolve(this.#cacheDir, cached.fileName),
            cached,
            content: /** @type {Buffer | undefined} */ (undefined),
          }
        }
        const downloaded = await runImageOperation(
          "download",
          this.#rootDir,
          source,
          () => getRemote(source, "__r", index, cached
            ? { etag: cached.etag, lastModified: cached.lastModified }
            : undefined),
        )
        if (downloaded.status === "not-modified") {
          if (!cached) {
            throw new NodeImageError(
              new Error("Remote image returned 304 without a cached source."),
              { operation: "download", rootDir: this.#rootDir, source },
            )
          }
          return {
            source,
            key,
            file: path.resolve(this.#cacheDir, cached.fileName),
            cached: {
              ...cached,
              fetchedAt: Date.now(),
              ...(downloaded.etag ? { etag: downloaded.etag } : {}),
              ...(downloaded.lastModified
                ? { lastModified: downloaded.lastModified }
                : {}),
            },
            content: /** @type {Buffer | undefined} */ (undefined),
          }
        }
        const file = path.resolve(this.#cacheDir, downloaded.fileName)
        await runImageOperation("cache", this.#rootDir, source, () =>
          fs.promises.writeFile(file, downloaded.data)
        )
        return {
          source,
          key,
          file,
          cached: {
            index,
            fileName: downloaded.fileName,
            fetchedAt: Date.now(),
            ...(downloaded.etag ? { etag: downloaded.etag } : {}),
            ...(downloaded.lastModified
              ? { lastModified: downloaded.lastModified }
              : {}),
          },
          content: downloaded.data,
        }
      },
    )

    /** @type {Map<string, string>} */
    const sourceFiles = new Map()
    /** @type {Map<string, Buffer>} */
    const sourceContents = new Map()
    /** @type {Map<string, {key: string, cached: CachedRemoteSource}>} */
    const remoteCacheEntries = new Map()
    const localSources = [...new Set(
      references
        .map(({ source }) => source)
        .filter((source) => !source.startsWith("http")),
    )].sort()
    for (const source of localSources) {
      sourceFiles.set(
        source,
        path.resolve(this.#rootDir, source.replace(/^\//, "")),
      )
    }
    for (const item of downloadedSources) {
      sourceFiles.set(item.source, item.file)
      if (item.content) sourceContents.set(item.source, item.content)
      remoteCacheEntries.set(item.source, {
        key: item.key,
        cached: /** @type {CachedRemoteSource} */ (item.cached),
      })
    }

    /** @type {Map<string, ImageRecipe>} */
    const recipes = new Map()
    /** @type {Map<string, string>} */
    const sourceHashes = new Map()
    const preparedSources = await mapConcurrent(
      [...sourceFiles],
      imageConcurrency,
      async ([source, fileName]) => {
        if (!fs.existsSync(fileName)) {
          throw new NodeImageError(
            new Error("Image source does not exist."),
            { operation: "read", rootDir: this.#rootDir, source },
          )
        }
        const remoteEntry = remoteCacheEntries.get(source)?.cached
        if (
          !sourceContents.has(source) && remoteEntry?.hash &&
          Number(remoteEntry.width) > 0 && Number(remoteEntry.height) > 0
        ) {
          return {
            source,
            fileName,
            hash: remoteEntry.hash,
            width: Number(remoteEntry.width),
            height: Number(remoteEntry.height),
          }
        }
        const sourceContent = sourceContents.get(source) ??
          await runImageOperation(
            "read",
            this.#rootDir,
            source,
            () => fs.promises.readFile(fileName),
          )
        const hash = generateHash(sourceContent)
        const cachedMetadata = cacheManifest.metadata[hash]
        const { width, height } = cachedMetadata ?? await runImageOperation(
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
        return { source, fileName, hash, width, height }
      },
    )
    for (const prepared of preparedSources) {
      const { source, fileName, hash, width, height } = prepared
      sourceHashes.set(source, hash)
      cacheManifest.metadata[hash] = { width, height }
      const remoteEntry = remoteCacheEntries.get(source)
      if (options.useCache && remoteEntry) {
        cacheManifest.remoteSources[remoteEntry.key] = {
          ...remoteEntry.cached,
          hash,
          width,
          height,
        }
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

    /** @type {Map<import("../../core/graph/index.js").ArtifactId, {id: import("../../core/graph/index.js").ArtifactId, source: string, inputFile: string, pattern: ImagePattern, cacheFile: string, cacheKey: string}>} */
    const artifactTasks = new Map()
    /** @type {Map<string, Map<string, import("../../core/graph/index.js").ArtifactId>>} */
    const artifactIdsBySource = new Map()
    /** @type {{reference: ImageReference, view: ReturnType<typeof getView>, attrs: ReturnType<typeof getPatternAttrs>}[]} */
    const plannedReferences = []

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
      plannedReferences.push({ reference, view, attrs })
      const sourceArtifacts = artifactIdsBySource.get(reference.source) ??
        new Map()
      artifactIdsBySource.set(reference.source, sourceArtifacts)

      for (const pattern of Object.values(patternMap)) {
        const id = createNodeId("artifact", `image/${pattern.fileName}`)
        const current = artifactTasks.get(id)
        if (current) {
          if (current.source === reference.source) {
            sourceArtifacts.set(pattern.fileName, id)
          }
          continue
        }
        const cacheFile = path.resolve(this.#cacheDir, pattern.fileName)
        const cacheKey = generateHash(
          `${sourceHashes.get(reference.source)}:${JSON.stringify(pattern)}`,
        )
        artifactTasks.set(id, {
          id,
          source: reference.source,
          inputFile,
          pattern: /** @type {ImagePattern} */ (pattern),
          cacheFile,
          cacheKey,
        })
        sourceArtifacts.set(pattern.fileName, id)
      }
    }

    const generatedResults = await mapConcurrent(
      [...artifactTasks.values()],
      imageConcurrency,
      async ({ id, source, inputFile, pattern, cacheFile, cacheKey }) => {
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
            source,
            () => fs.promises.readFile(cacheFile),
          )
        } else {
          content = await runImageOperation(
            "transform",
            this.#rootDir,
            source,
            () => runSharp(inputFile, pattern),
          )
          if (options.useCache) {
            await runImageOperation(
              "cache",
              this.#rootDir,
              source,
              async () => {
                await fs.promises.mkdir(path.dirname(cacheFile), {
                  recursive: true,
                })
                await fs.promises.writeFile(cacheFile, content)
              },
            )
          }
        }
        return {
          fileName: pattern.fileName,
          cacheKey,
          artifact: Object.freeze({
            id,
            source,
            fileName: pattern.fileName,
            mediaType: mediaType(String(pattern.format)),
            content: new Uint8Array(content),
          }),
        }
      },
    )
    for (const { fileName, cacheKey } of generatedResults) {
      if (options.useCache) cacheManifest.artifacts[fileName] = cacheKey
    }
    const generatedArtifacts = generatedResults.map(({ artifact }) => artifact)
    /** @type {Map<import("../../core/graph/index.js").ArtifactId, GeneratedImageArtifact>} */
    const artifacts = new Map(
      generatedArtifacts.map((artifact) => [artifact.id, artifact]),
    )
    /** @type {GeneratedImagePlan[]} */
    const plans = []

    for (const { reference, view, attrs } of plannedReferences) {
      const artifactByFileName = artifactIdsBySource.get(reference.source) ??
        new Map()
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
