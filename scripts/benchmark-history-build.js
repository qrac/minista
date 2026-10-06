// node scripts/benchmark-history-build.js <v4-root> <current-v5-root> [previous-v5-root]
// Use disposable checkouts: generated output and project caches are removed per sample.
import { execFileSync } from "node:child_process"
import { existsSync, rmSync } from "node:fs"
import path from "node:path"
import { performance } from "node:perf_hooks"
import assert from "node:assert/strict"

const [v4, current, oldV5] = process.argv.slice(2)
assert.ok(v4 && current, "Supply disposable v4 and current v5 repository roots")
const roots = Object.fromEntries(
  Object.entries({ v4, current, oldV5 })
    .filter(([, root]) => root)
    .map(([version, root]) => [version, path.resolve(root)])
)
console.log(JSON.stringify({ node: process.version, platform: process.platform, arch: process.arch }))

function run(version, fixture, warmup) {
  const root = roots[version]
  const project = path.join(root, "playground", fixture)
  for (const folder of ["dist", ".minista", "node_modules/.minista", "node_modules/.vite", "node_modules/.vite-temp"]) {
    rmSync(path.join(project, folder), { recursive: true, force: true })
  }
  const start = performance.now()
  execFileSync(process.execPath, [path.join(root, "packages/minista/bin/minista.js"), "build", `./playground/${fixture}`, "--logLevel", "silent"], {
    cwd: root,
    stdio: "pipe",
    env: { ...process.env, PATH: `${path.join(root, "node_modules/.bin")}${path.delimiter}${process.env.PATH}` },
  })
  const ms = performance.now() - start
  assert.ok(existsSync(path.join(project, "dist/index.html")), `${version}/${fixture} did not emit index.html`)
  console.log(JSON.stringify({ version, fixture, warmup, ms }))
}

for (const fixture of ["_default", "public", "head", "entry", "island", "search", "svg", "comment", "archive"]) {
  const versions = fixture === "_default" && roots.oldV5 ? ["v4", "oldV5", "current"] : ["v4", "current"]
  for (const version of versions) run(version, fixture, true)
  for (let round = 0; round < 3; round++) {
    for (const version of round % 2 ? [...versions].reverse() : versions) run(version, fixture, false)
  }
}
