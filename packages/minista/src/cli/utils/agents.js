// @ts-check

import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { resolveWorkspaceDirectory } from "../../adapters/filesystem/workspace-directory.js"
import { writeAgentInstructions } from "../../adapters/filesystem/agent-instructions.js"
import { reportCliDiagnostic } from "./diagnostic.js"

const packageUrl = new URL("../../../", import.meta.url)

/** @param {string} file */
async function snapshot(file) {
  try {
    const stat = await fs.stat(file)
    return { path: file, exists: stat.isFile() }
  } catch (error) {
    if (!error || typeof error !== "object" || Reflect.get(error, "code") !== "ENOENT") throw error
    return { path: file, exists: false }
  }
}

/** @param {string[]} args */
export async function runAgentsCommand(args) {
  const json = args.includes("--json")
  try {
    const positionals = args.filter((arg) => !arg.startsWith("-"))
    if (positionals.length > 1 || args.some((arg) => arg.startsWith("-") && !["--json", "--write"].includes(arg))) {
      throw Object.assign(new Error("Usage: minista agents [root] [--json] [--write]"), { code: "MINISTA_AGENTS_ARGS_INVALID" })
    }
    const root = path.resolve(positionals[0] || ".")
    if (!(await fs.stat(root)).isDirectory()) throw new Error("Project root must be a directory.")
    const guidePath = fileURLToPath(new URL("AGENTS.md", packageUrl))
    const guide = await fs.readFile(guidePath, "utf8")
    const pkg = JSON.parse(await fs.readFile(new URL("package.json", packageUrl), "utf8"))
    const workspaceDirectory = resolveWorkspaceDirectory(root)
    const [manifest, diagnostics] = await Promise.all([
      snapshot(path.join(workspaceDirectory, "manifest.json")),
      snapshot(path.join(workspaceDirectory, "diagnostics.json")),
    ])
    const status = args.includes("--write")
      ? await writeAgentInstructions(root, await fs.readFile(new URL("agents/bootstrap.md", packageUrl), "utf8"))
      : undefined
    const result = {
      schemaVersion: "1", command: "agents", ok: true,
      data: {
        version: pkg.version, root,
        guide: { path: guidePath, content: guide },
        workspace: { directory: workspaceDirectory, manifest, diagnostics },
        ...(status ? { instructions: { path: path.join(root, "AGENTS.md"), status } } : {}),
      },
      diagnostics: [],
    }
    if (json) console.log(JSON.stringify(result, null, 2))
    else if (status) console.log(`AGENTS.md: ${status}`)
    else console.log(guide)
  } catch (error) {
    const code = error && typeof error === "object" ? Reflect.get(error, "code") : undefined
    const diagnostic = {
      code: /** @type {`MINISTA_${string}`} */ (typeof code === "string" && code.startsWith("MINISTA_") ? code : "MINISTA_AGENTS_FAILED"),
      severity: /** @type {const} */ ("error"),
      message: error instanceof Error ? error.message : String(error),
    }
    if (json) console.log(JSON.stringify({ schemaVersion: "1", command: "agents", ok: false, data: null, diagnostics: [diagnostic] }, null, 2))
    else reportCliDiagnostic(diagnostic)
    process.exitCode = 1
  }
}
