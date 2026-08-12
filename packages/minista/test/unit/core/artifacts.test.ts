import { describe, expect, test } from "vitest"

import {
  ArtifactConflictError,
  MemoryArtifactStore,
  MemoryEmitter,
  createNodeId,
} from "../../../src/core/index.js"

describe("memory artifact ports", () => {
  test("stores deterministic records and rejects conflicting writes", async () => {
    const store = new MemoryArtifactStore()
    const id = createNodeId("artifact", "page/index.html")
    const owner = createNodeId("feature", "ssg")
    const record = {
      schemaVersion: "1" as const,
      id,
      owner,
      mediaType: "text/html",
      content: "<h1>Hello</h1>",
    }

    await store.put(record)
    await store.put(record)
    expect(await store.get(id)).toEqual(record)

    await expect(
      store.put({ ...record, content: "<h1>Changed</h1>" }),
    ).rejects.toBeInstanceOf(ArtifactConflictError)
  })

  test("emits each output path only once", async () => {
    const emitter = new MemoryEmitter()
    await emitter.emit({ fileName: "index.html", content: "home" })

    await expect(
      emitter.emit({ fileName: "index.html", content: "changed" }),
    ).rejects.toThrow("already emitted")
    expect(await emitter.list()).toEqual([
      { fileName: "index.html", content: "home" },
    ])
  })
})
