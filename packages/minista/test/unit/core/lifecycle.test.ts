import { describe, expect, test } from "vitest"

import {
  DiagnosticCollector,
  LifecycleRunner,
  MemoryArtifactStore,
  MemoryEmitter,
  MemoryHtmlDocumentStore,
  ProjectGraph,
  createNodeId,
  scheduleFeatures,
  toProjectPath,
  type Capability,
  type MinistaFeature,
} from "../../../src/core/index.js"

function createDependencies() {
  const diagnostics = new DiagnosticCollector()
  return {
    diagnostics,
    documents: new MemoryHtmlDocumentStore(),
    graph: new ProjectGraph(
      {
        id: createNodeId("project", "fixture"),
        name: "fixture",
        root: toProjectPath("."),
      },
      diagnostics,
    ),
    artifacts: new MemoryArtifactStore(),
    emitter: new MemoryEmitter(),
  }
}

const capability = (value: string) => value as Capability

describe("feature scheduler and lifecycle", () => {
  test("orders features by capability instead of plugin array order", () => {
    const diagnostics = new DiagnosticCollector()
    const consumer: MinistaFeature = {
      id: createNodeId("feature", "search"),
      apiVersion: 1,
      options: {},
      requires: [capability("pages")],
      hooks: {},
    }
    const provider: MinistaFeature = {
      id: createNodeId("feature", "ssg"),
      apiVersion: 1,
      options: {},
      provides: [capability("pages")],
      hooks: {},
    }

    expect(scheduleFeatures([consumer, provider], diagnostics).map(({ id }) => id)).toEqual([
      provider.id,
      consumer.id,
    ])
  })

  test("reports cycles with a stable diagnostic code", () => {
    const diagnostics = new DiagnosticCollector()
    const leftId = createNodeId("feature", "left")
    const rightId = createNodeId("feature", "right")
    const features: MinistaFeature[] = [
      { id: leftId, apiVersion: 1, options: {}, after: [rightId], hooks: {} },
      { id: rightId, apiVersion: 1, options: {}, after: [leftId], hooks: {} },
    ]

    expect(scheduleFeatures(features, diagnostics)).toEqual([])
    expect(diagnostics.byCode("MINISTA_FEATURE_CYCLE")).toHaveLength(1)
  })

  test("orders an optional dependency only when it is present", () => {
    const diagnostics = new DiagnosticCollector()
    const formatterId = createNodeId("feature", "beautify")
    const archive: MinistaFeature = {
      id: createNodeId("feature", "archive"),
      apiVersion: 1,
      options: {},
      optionalAfter: [formatterId],
      hooks: {},
    }
    const formatter: MinistaFeature = {
      id: formatterId,
      apiVersion: 1,
      options: {},
      hooks: {},
    }

    expect(scheduleFeatures([archive], diagnostics).map(({ id }) => id)).toEqual([
      archive.id,
    ])
    expect(
      scheduleFeatures([archive, formatter], diagnostics).map(({ id }) => id),
    ).toEqual([formatter.id, archive.id])
    expect(diagnostics.hasErrors()).toBe(false)
  })

  test("runs explicit phases and converts hook failures to diagnostics", async () => {
    const dependencies = createDependencies()
    const calls: string[] = []
    const feature: MinistaFeature = {
      id: createNodeId("feature", "ssg"),
      apiVersion: 1,
      options: {},
      hooks: {
        discover: ({ phase }) => {
          calls.push(phase)
        },
        render: () => {
          throw new Error("render exploded")
        },
      },
    }
    const runner = new LifecycleRunner([feature], dependencies)
    const result = await runner.run({ phases: ["discover", "render"] })

    expect(result.ok).toBe(false)
    expect(calls).toEqual(["discover"])
    expect(dependencies.diagnostics.byCode("MINISTA_RENDER_FAILED")).toHaveLength(1)
    expect(result.traces.map(({ type }) => type)).toEqual([
      "phase:start",
      "feature:start",
      "feature:end",
      "phase:end",
      "phase:start",
      "feature:start",
    ])
  })
})
