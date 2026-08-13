// @ts-check

import fs from "node:fs"
import path from "node:path"
import { randomUUID } from "node:crypto"

import {
  parseProjectManifest,
  serializeProjectManifest,
} from "../../core/manifest/index.js"
import { serializeStableJson } from "../../core/serialization/index.js"
import { parseIslandSnippets } from "../../features/island/index.js"
import { parseRenderedPages } from "../../features/ssg/index.js"

export class ExternalBuildHandoffInvalidError extends Error {
  code = "MINISTA_EXTERNAL_HANDOFF_INVALID"

  /** @param {string} message */
  constructor(message) {
    super(message)
    this.name = "ExternalBuildHandoffInvalidError"
  }
}

/** @param {string} buildId */
function assertBuildId(buildId) {
  if (!/^[a-zA-Z0-9:_-]+$/.test(buildId)) {
    throw new TypeError("External build ID contains unsupported characters.")
  }
}

/** @param {string} root @param {string} buildId */
function resolveDirectory(root, buildId) {
  assertBuildId(buildId)
  return path.resolve(root, ".minista", "work", buildId, "external")
}

/** @param {string} root @param {string} buildId */
function resolveBuildDirectory(root, buildId) {
  assertBuildId(buildId)
  return path.resolve(root, ".minista", "work", buildId)
}

/** @param {string} root @param {string} buildId @param {string} name */
function resolveSnapshotFile(root, buildId, name) {
  return path.resolve(resolveDirectory(root, buildId), `${name}.json`)
}

/** @param {string} file @param {unknown} value */
async function writeJson(file, value) {
  const directory = path.dirname(file)
  const pending = path.resolve(directory, `.${path.basename(file)}.${randomUUID()}.tmp`)
  await fs.promises.mkdir(directory, { recursive: true })
  try {
    await fs.promises.writeFile(pending, serializeStableJson(value), "utf8")
    await fs.promises.rename(pending, file)
  } catch (error) {
    await fs.promises.rm(pending, { force: true })
    throw error
  }
}

/** @param {string} file */
async function readJson(file) {
  try {
    return JSON.parse(await fs.promises.readFile(file, "utf8"))
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      Reflect.get(error, "code") === "ENOENT"
    ) return undefined
    if (error instanceof SyntaxError) {
      throw new ExternalBuildHandoffInvalidError(
        `External build handoff ${path.basename(file)} contains invalid JSON.`,
      )
    }
    throw error
  }
}

/** @param {unknown} value */
function parseRenderedPagesSnapshot(value) {
  if (!value || typeof value !== "object") {
    throw new ExternalBuildHandoffInvalidError(
      "Rendered pages handoff must be an object.",
    )
  }
  const record = /** @type {Record<string, unknown>} */ (value)
  if (record.schemaVersion !== "1" || record.kind !== "rendered-pages" ||
    !Array.isArray(record.pages) || !record.pages.every((page) =>
      page && typeof page === "object" &&
      typeof Reflect.get(page, "url") === "string" &&
      typeof Reflect.get(page, "fileName") === "string" &&
      typeof Reflect.get(page, "html") === "string"
    )) {
    throw new ExternalBuildHandoffInvalidError(
      "Rendered pages handoff does not match schema version 1.",
    )
  }
  return parseRenderedPages(record.pages)
}

/** @param {unknown} value */
function parseIslandSnippetsSnapshot(value) {
  if (!value || typeof value !== "object") {
    throw new ExternalBuildHandoffInvalidError(
      "Island snippets handoff must be an object.",
    )
  }
  const record = /** @type {Record<string, unknown>} */ (value)
  if (record.schemaVersion !== "1" || record.kind !== "island-snippets" ||
    !Array.isArray(record.snippets) ||
    !record.snippets.every((snippet) => typeof snippet === "string")) {
    throw new ExternalBuildHandoffInvalidError(
      "Island snippets handoff does not match schema version 1.",
    )
  }
  return parseIslandSnippets(record.snippets)
}

export class NodeExternalBuildHandoff {
  /** @param {string} root @param {string} buildId @param {readonly {url: string, fileName: string, html: string}[]} pages */
  async writeRenderedPages(root, buildId, pages) {
    const file = resolveSnapshotFile(root, buildId, "rendered-pages")
    await writeJson(file, {
      schemaVersion: "1",
      kind: "rendered-pages",
      pages,
    })
    return file
  }

  /** @param {string} root @param {string} buildId */
  async readRenderedPages(root, buildId) {
    const value = await readJson(
      resolveSnapshotFile(root, buildId, "rendered-pages"),
    )
    return value === undefined ? undefined : parseRenderedPagesSnapshot(value)
  }

  /** @param {string} root @param {string} buildId @param {readonly string[]} snippets */
  async writeIslandSnippets(root, buildId, snippets) {
    const file = resolveSnapshotFile(root, buildId, "island-snippets")
    await writeJson(file, {
      schemaVersion: "1",
      kind: "island-snippets",
      snippets,
    })
    return file
  }

  /** @param {string} root @param {string} buildId */
  async readIslandSnippets(root, buildId) {
    const value = await readJson(
      resolveSnapshotFile(root, buildId, "island-snippets"),
    )
    return value === undefined ? undefined : parseIslandSnippetsSnapshot(value)
  }

  /**
   * @param {string} root
   * @param {string} buildId
   * @param {import("../../core/manifest/index.js").ProjectManifest} manifest
   */
  async write(root, buildId, manifest) {
    const directory = resolveDirectory(root, buildId)
    const file = path.resolve(directory, "manifest.json")
    const pending = path.resolve(directory, `.manifest.${randomUUID()}.tmp`)
    await fs.promises.mkdir(directory, { recursive: true })
    try {
      await fs.promises.writeFile(
        pending,
        serializeProjectManifest(manifest),
        "utf8",
      )
      await fs.promises.rename(pending, file)
    } catch (error) {
      await fs.promises.rm(pending, { force: true })
      throw error
    }
    return file
  }

  /** @param {string} root @param {string} buildId */
  async read(root, buildId) {
    const file = path.resolve(
      resolveDirectory(root, buildId),
      "manifest.json",
    )
    try {
      return parseProjectManifest(
        JSON.parse(await fs.promises.readFile(file, "utf8")),
      )
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        Reflect.get(error, "code") === "ENOENT"
      ) {
        return undefined
      }
      throw error
    }
  }

  /** @param {string} root @param {string} buildId */
  async clear(root, buildId) {
    await fs.promises.rm(resolveBuildDirectory(root, buildId), {
      recursive: true,
      force: true,
    })
    await fs.promises.rmdir(path.resolve(root, ".minista", "work"))
      .catch(() => {})
  }
}
