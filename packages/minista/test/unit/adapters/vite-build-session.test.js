import { describe, expect, test } from "vitest"
import { resolveConfig } from "vite"

import {
  attachViteBuildSession,
  createViteBuildSession,
  disposeViteBuildSession,
  getViteBuildSession,
} from "../../../src/adapters/vite/build-session.js"
import {
  MemoryArtifactStore,
  MemoryEmitter,
  MemoryHtmlDocumentStore,
} from "../../../src/core/index.js"

describe("Vite build session", () => {
  test("preserves an explicit artifact store through Vite config resolution", async () => {
    const session = { artifacts: new MemoryArtifactStore() }
    const config = await resolveConfig(
      attachViteBuildSession({ configFile: false }, session),
      "build",
    )

    expect(getViteBuildSession(config)).toBe(session)
  })
})

test("creates one build identity and clears artifacts during disposal", async () => {
  const session = createViteBuildSession({ buildId: "build:test" })
  await session.artifacts.put({
    schemaVersion: "1",
    id: /** @type {import("../../../src/core/graph/index.js").ArtifactId} */ (
      "artifact:test"
    ),
    owner: /** @type {import("../../../src/core/graph/index.js").FeatureId} */ (
      "feature:test"
    ),
    mediaType: "text/plain",
    content: "test",
  })

  expect(session.buildId).toBe("build:test")
  expect(session.diagnostics.snapshot()).toEqual([])
  expect(await session.artifacts.list()).toHaveLength(1)
  session.state.compatibilityDocuments = new MemoryHtmlDocumentStore()
  session.state.compatibilityDocumentIds = new Map()
  session.state.compatibilityTraces = []
  session.state.compatibilityEmitter = new MemoryEmitter()

  await disposeViteBuildSession(session)
  expect(await session.artifacts.list()).toEqual([])
  expect(session.state).toEqual({})
})
