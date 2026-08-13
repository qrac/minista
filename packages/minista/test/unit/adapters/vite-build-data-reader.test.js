import { describe, expect, test, vi } from "vitest"

import { ViteBuildDataReader } from "../../../src/adapters/vite/build-data-reader.js"
import { createViteBuildSession } from "../../../src/adapters/vite/build-session.js"
import { createNodeId } from "../../../src/core/graph/index.js"
import { createIslandSnippetsArtifactId } from "../../../src/features/island/index.js"
import { createRenderedPagesArtifactId } from "../../../src/features/ssg/index.js"

describe("Vite build data reader", () => {
  test("reads and validates build-session artifacts before external data", async () => {
    const session = createViteBuildSession({ buildId: "session" })
    await session.artifacts.put({
      schemaVersion: "1",
      id: createRenderedPagesArtifactId(),
      owner: createNodeId("feature", "ssg"),
      mediaType: "application/vnd.minista.rendered-pages+json",
      content: JSON.stringify([
        { url: "/", fileName: "index.html", html: "<h1>Session</h1>" },
      ]),
    })
    await session.artifacts.put({
      schemaVersion: "1",
      id: createIslandSnippetsArtifactId(),
      owner: createNodeId("feature", "island"),
      mediaType: "application/vnd.minista.island-snippets+json",
      content: JSON.stringify(["session-snippet"]),
    })
    const handoff = {
      readRenderedPages: vi.fn(),
      readIslandSnippets: vi.fn(),
    }
    const reader = new ViteBuildDataReader({
      root: "/fixture",
      session,
      externalBuildId: "external",
      handoff: /** @type {any} */ (handoff),
    })

    await expect(reader.readRenderedPages()).resolves.toEqual([
      { url: "/", fileName: "index.html", html: "<h1>Session</h1>" },
    ])
    await expect(reader.readIslandSnippets()).resolves.toEqual([
      "session-snippet",
    ])
    expect(handoff.readRenderedPages).not.toHaveBeenCalled()
    expect(handoff.readIslandSnippets).not.toHaveBeenCalled()
  })

  test("uses the build-scoped external handoff without a session", async () => {
    const handoff = {
      readRenderedPages: vi.fn(async () => [
        { url: "/docs/", fileName: "docs/index.html", html: "docs" },
      ]),
      readIslandSnippets: vi.fn(async () => ["external-snippet"]),
    }
    const reader = new ViteBuildDataReader({
      root: "/fixture",
      externalBuildId: "external",
      handoff: /** @type {any} */ (handoff),
    })

    await expect(reader.readRenderedPages()).resolves.toMatchObject([
      { url: "/docs/", fileName: "docs/index.html" },
    ])
    await expect(reader.readIslandSnippets()).resolves.toEqual([
      "external-snippet",
    ])
    expect(handoff.readRenderedPages).toHaveBeenCalledWith(
      "/fixture",
      "external",
    )
  })

  test("rejects malformed artifact content", async () => {
    const session = createViteBuildSession()
    await session.artifacts.put({
      schemaVersion: "1",
      id: createRenderedPagesArtifactId(),
      owner: createNodeId("feature", "ssg"),
      mediaType: "application/vnd.minista.rendered-pages+json",
      content: JSON.stringify([{ url: "/" }]),
    })

    await expect(new ViteBuildDataReader({
      root: "/fixture",
      session,
    }).readRenderedPages()).rejects.toThrow(
      "Rendered pages must be an array of page snapshots.",
    )
  })
})
