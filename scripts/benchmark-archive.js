// Run each mode in a fresh process against the same source directory.
// node scripts/benchmark-archive.js buffered|stream zip|tar ROOT
import fs from "node:fs/promises"
import path from "node:path"
import { NodeArchiveBuilder, NodeArchivePublisher } from "../packages/minista/src/adapters/archive/node.js"
import { MemoryEmitter } from "../packages/minista/src/core/artifacts/memory.js"
const [mode, format, root] = process.argv.slice(2)
if (!["buffered", "stream"].includes(mode) || !["zip", "tar"].includes(format) || !root) {
  throw new Error("Expected buffered|stream zip|tar ROOT (with input/ directory)")
}
const options = { srcDir: "input", outName: "site", format: /** @type {"zip" | "tar"} */ (format) }
const fileName = `${mode}.${format}`
const start = performance.now()
if (mode === "buffered") {
  const content = await new NodeArchiveBuilder(root).build(options)
  const emitter = new MemoryEmitter()
  await emitter.emit({ fileName, content })
  const outputs = await emitter.list()
  await fs.writeFile(path.join(root, fileName), outputs[0].content)
} else {
  await new NodeArchivePublisher(root, root).publish(options, fileName)
}
console.log(JSON.stringify({ mode, format, ms: performance.now() - start,
  maxRSSKiB: process.resourceUsage().maxRSS, bytes: (await fs.stat(path.join(root, fileName))).size }))
