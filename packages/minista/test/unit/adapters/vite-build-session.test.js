import { describe, expect, test } from "vitest"
import { resolveConfig } from "vite"

import {
  attachViteBuildSession,
  getViteBuildSession,
} from "../../../src/adapters/vite/build-session.js"
import { MemoryArtifactStore } from "../../../src/core/index.js"

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
