// @ts-check

import fs from "node:fs/promises"
import path from "node:path"
import { randomUUID } from "node:crypto"

const startMarker = "<!-- minista:agents:start -->"
const endMarker = "<!-- minista:agents:end -->"

export class AgentInstructionsConflictError extends Error {
  code = "MINISTA_AGENTS_CONFLICT"
  constructor() {
    super("AGENTS.md has ambiguous minista markers or is not a regular file. Preserve it and resolve the conflict before retrying.")
    this.name = "AgentInstructionsConflictError"
  }
}

/** Replace only the owned block, preserving all other bytes.
 * @param {string} source
 * @param {string} block
 */
export function mergeAgentInstructions(source, block) {
  const starts = source.split(startMarker).length - 1
  const ends = source.split(endMarker).length - 1
  if (starts === 0 && ends === 0) {
    return source + (source ? (source.endsWith("\n\n") ? "" : source.endsWith("\n") ? "\n" : "\n\n") : "") + block
  }
  const start = source.indexOf(startMarker)
  const end = source.indexOf(endMarker)
  if (starts !== 1 || ends !== 1 || end < start) throw new AgentInstructionsConflictError()
  return source.slice(0, start) + block.trimEnd() + source.slice(end + endMarker.length)
}

/** @param {string} root @param {string} block */
export async function writeAgentInstructions(root, block) {
  const file = path.join(root, "AGENTS.md")
  let source
  let mode
  try {
    const stat = await fs.lstat(file)
    if (!stat.isFile()) throw new AgentInstructionsConflictError()
    mode = stat.mode
    source = await fs.readFile(file, "utf8")
  } catch (error) {
    if (!error || typeof error !== "object" || Reflect.get(error, "code") !== "ENOENT") throw error
  }
  if (source === undefined) {
    // Exclusive creation preserves a file created concurrently.
    await fs.writeFile(file, block, { encoding: "utf8", flag: "wx" })
    return "created"
  }
  const next = mergeAgentInstructions(source, block)
  if (next === source) return "unchanged"
  const pending = path.join(root, `.AGENTS.md.${randomUUID()}.tmp`)
  try {
    await fs.writeFile(pending, next, { encoding: "utf8", mode, flag: "wx" })
    // Do not replace instructions modified during preparation.
    if (!(await fs.lstat(file)).isFile() || await fs.readFile(file, "utf8") !== source) {
      throw new AgentInstructionsConflictError()
    }
    await fs.rename(pending, file)
  } finally {
    await fs.rm(pending, { force: true })
  }
  return "updated"
}
