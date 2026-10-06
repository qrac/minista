import { execFileSync } from "node:child_process"
import { test, expect } from "vitest"

for (const mode of ["import", "ssg", "image", "svg", "sprite", "archive", "beautify"]) {
  test(`fresh process lazy dependencies: ${mode}`, () => {
    const output = execFileSync(process.execPath, ["scripts/benchmark-lazy-dependencies.js", mode], { encoding: "utf8" })
    expect(JSON.parse(output).mode).toBe(mode)
  }, 30000)
}
for (const [mode, dependency] of Object.entries({ image: "sharp", svg: "svgo", sprite: "svgo", archive: "archiver", beautify: "js-beautify" })) {
  test(`fresh process initialization failure: ${mode}`, () => {
    execFileSync(process.execPath, ["scripts/benchmark-lazy-dependencies.js", mode], {
      env: { ...process.env, FAIL_IMPORT: dependency },
      stdio: "pipe",
    })
  }, 30000)
}
