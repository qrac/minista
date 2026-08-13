// @ts-check

import { randomUUID } from "node:crypto"

import { MemoryArtifactStore } from "../../core/artifacts/index.js"
import { DiagnosticCollector } from "../../core/diagnostics/index.js"

/** @typedef {import("./build-session.js").ViteBuildSession} ViteBuildSession */

export const MINISTA_BUILD_SESSION_KEY = "__ministaBuildSession"

/**
 * @param {{buildId?: string, artifacts?: import("../../core/artifacts/index.js").ArtifactStore, diagnostics?: DiagnosticCollector}} [options]
 * @returns {ViteBuildSession}
 */
export function createViteBuildSession(options = {}) {
  return Object.freeze({
    buildId: options.buildId ?? randomUUID(),
    artifacts: options.artifacts ?? new MemoryArtifactStore(),
    diagnostics: options.diagnostics ?? new DiagnosticCollector(),
  })
}

/** @param {ViteBuildSession} session */
export async function disposeViteBuildSession(session) {
  await session.artifacts.clear()
}

/**
 * @param {object} config
 * @param {ViteBuildSession} session
 */
export function attachViteBuildSession(config, session) {
  return { ...config, [MINISTA_BUILD_SESSION_KEY]: session }
}

/** @param {unknown} config */
export function getViteBuildSession(config) {
  if (!config || typeof config !== "object") return undefined
  const session = Reflect.get(config, MINISTA_BUILD_SESSION_KEY)
  if (!session || typeof session !== "object") return undefined
  const artifacts = Reflect.get(session, "artifacts")
  return artifacts && typeof artifacts.get === "function"
    ? /** @type {ViteBuildSession} */ (session)
    : undefined
}
