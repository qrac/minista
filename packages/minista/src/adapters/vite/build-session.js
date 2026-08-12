// @ts-check

/** @typedef {import("./build-session.js").ViteBuildSession} ViteBuildSession */

export const MINISTA_BUILD_SESSION_KEY = "__ministaBuildSession"

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
