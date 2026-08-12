import { describe, expect, test } from "vitest"

import {
  DiagnosticCollector,
  formatDiagnostic,
  toProjectPath,
} from "../../../src/core/index.js"

describe("DiagnosticCollector", () => {
  test("keeps structured diagnostics and a stable summary", () => {
    const diagnostics = new DiagnosticCollector()
    diagnostics.error({
      code: "MINISTA_ROUTE_MISSING_PARAM",
      message: "Route parameter slug is missing.",
      hint: "Return paths.slug from getStaticData().",
      phase: "resolve",
      location: { file: toProjectPath("src/pages/[slug].tsx"), line: 12 },
    })
    diagnostics.warning({
      code: "MINISTA_EXPERIMENTAL_API",
      message: "Experimental adapter is enabled.",
    })

    expect(diagnostics.hasErrors()).toBe(true)
    expect(diagnostics.summary()).toEqual({ errors: 1, warnings: 1, info: 0 })
    expect(formatDiagnostic(diagnostics.snapshot()[0]!)).toBe(
      "[MINISTA_ROUTE_MISSING_PARAM] resolve src/pages/[slug].tsx:12 Route parameter slug is missing.\n" +
        "  hint: Return paths.slug from getStaticData().",
    )
  })
})
