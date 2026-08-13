import { describe, expect, test } from "vitest"

import { collectViteOutputClaims } from "../../../src/adapters/vite/output-claims.js"
import { createNodeId } from "../../../src/core/graph/index.js"

describe("Vite output claims", () => {
  test("collects explicit feature descriptors and claims", async () => {
    const claim = {
      id: createNodeId("artifact", "search-data"),
      kind: /** @type {const} */ ("data"),
      owner: createNodeId("feature", "search"),
      source: "search-data",
      fileName: "assets/search.json",
      pageUrls: ["/"],
      dependencies: [],
    }
    const collected = await collectViteOutputClaims([/** @type {any} */ ({
      name: "fixture",
      api: {
        minista: {
          feature: {
            id: "search",
            apiVersion: 1,
            provides: ["search-data"],
            requires: ["html-documents"],
          },
          outputClaims: () => [claim],
        },
      },
    })])

    expect(collected.features).toEqual([{
      id: "feature:search",
      apiVersion: 1,
      provides: ["search-data"],
      requires: ["html-documents"],
    }])
    expect(collected.claims).toEqual([claim])
  })
})
