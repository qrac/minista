import { expect, test } from "vitest"
import { pluginArchive } from "../../../src/node.js"
import type { ArchiveOptions } from "../../../src/features/archive/index.js"
import type { UserPluginOptions } from "../../../src/plugins/archive/types.js"

test("public archive sources are optional while resolved recipes require a source", () => {
  const options: UserPluginOptions = {
    archives: [{ outName: "site" }, { outName: "source", srcDir: "src", format: "tar" }],
  }
  expect(pluginArchive(options).api.minista.feature.options).toEqual(options)
  // @ts-expect-error The Node builder and Core feature require resolved input.
  const unresolved: ArchiveOptions = { outName: "site" }
  // @ts-expect-error Unsupported formats are rejected by the public API.
  const unsupported: UserPluginOptions = { archives: [{ outName: "site", format: "7z" }] }
  void unresolved
  void unsupported
})
