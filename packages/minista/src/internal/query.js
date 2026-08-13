// @ts-check

import { NodeProjectManifestReader } from "../adapters/filesystem/project-manifest-reader.js"
import {
  inspectProjectManifest,
  traceProjectPage,
} from "../core/query/index.js"

export class ProjectQueryRequestInvalidError extends Error {
  code = "MINISTA_QUERY_REQUEST_INVALID"

  /** @param {string} message */
  constructor(message) {
    super(message)
    this.name = "ProjectQueryRequestInvalidError"
  }
}

/**
 * @param {import("../core/manifest/index.js").ProjectManifest} manifest
 * @param {import("./query.js").ProjectQueryRequest} request
 * @returns {import("./query.js").ProjectQueryResult}
 */
export function queryProjectManifest(manifest, request) {
  if (!request || typeof request !== "object") {
    throw new ProjectQueryRequestInvalidError(
      "Project query request must be an object.",
    )
  }
  if (request.kind === "inspect") return inspectProjectManifest(manifest)
  if (request.kind === "trace-page" && typeof request.target === "string") {
    return traceProjectPage(manifest, request.target)
  }
  throw new ProjectQueryRequestInvalidError(
    "Project query kind must be inspect or trace-page.",
  )
}

/**
 * `.minista/manifest.json`だけを読み、user moduleやViteを起動せずqueryする。
 *
 * @param {string} root
 * @param {import("./query.js").ProjectQueryRequest} request
 * @param {{migrations?: readonly import("../core/manifest/index.js").ProjectManifestMigration[]}} [options]
 * @returns {Promise<import("./query.js").ProjectQueryResult>}
 */
export async function queryProject(root, request, options = {}) {
  const manifest = await new NodeProjectManifestReader(
    options.migrations ?? [],
  ).read(root)
  return queryProjectManifest(manifest, request)
}

export {
  ProjectManifestInvalidError,
  ProjectManifestVersionUnsupportedError,
} from "../core/manifest/index.js"
export { ProjectManifestNotFoundError } from "../adapters/filesystem/project-manifest-reader.js"
