import fs from "node:fs/promises"
import path from "node:path"
import os from "node:os"
import { promisify } from "node:util"
import { execFile } from "node:child_process"
import { afterEach, describe, expect, test } from "vitest"

const exec = promisify(execFile)
const bin = path.resolve(import.meta.dirname, "../../bin/minista.js")
const creator = path.resolve(import.meta.dirname, "../../../create-minista/bin/create-minista.js")
const bootstrap = new URL("../../agents/bootstrap.md", import.meta.url)
/** @type {string[]} */
const roots = []
async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "minista-agents-"))
  roots.push(root)
  return root
}
/** @param {string[]} args */
async function run(args) {
  try {
    const result = await exec(process.execPath, [bin, "agents", ...args])
    return { ...result, code: 0 }
  } catch (error) {
    if (!error || typeof error !== "object" || !("stdout" in error)) throw error
    return { stdout: String(error.stdout), stderr: String(Reflect.get(error, "stderr")), code: Reflect.get(error, "code") }
  }
}
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })))
})

describe("agent entry points", () => {
  test.each([false, true])("locates metadata read-only (package.json: %s) without config evaluation", async (hasPackage) => {
    const root = await fixture()
    if (hasPackage) await fs.writeFile(path.join(root, "package.json"), '{}')
    // Even conflicting, executable configs must not participate in discovery.
    await fs.writeFile(path.join(root, "vite.config.js"), 'throw Error("config executed")')
    await fs.writeFile(path.join(root, "minista.config.js"), 'throw Error("config executed")')
    const before = await fs.readdir(root)
    const result = await run([root, "--json"])
    const json = JSON.parse(result.stdout)
    expect(result).toMatchObject({ code: 0, stderr: "" })
    const directory = path.join(root, hasPackage ? "node_modules/.minista" : ".minista")
    expect(json).toMatchObject({ schemaVersion: "1", command: "agents", ok: true,
      data: { root, version: "5.0.0", workspace: { directory,
        manifest: { path: path.join(directory, "manifest.json"), exists: false },
        diagnostics: { exists: false },
      } }, diagnostics: [] })
    expect(json.data.guide.content).toBe(await fs.readFile(json.data.guide.path, "utf8"))
    expect(await fs.readdir(root)).toEqual(before)
    await fs.mkdir(directory, { recursive: true })
    await fs.writeFile(path.join(directory, "manifest.json"), '{}')
    expect(JSON.parse((await run([root, "--json"])).stdout).data.workspace.manifest.exists).toBe(true)
    expect((await run([root])).stdout).toBe(json.data.guide.content + "\n")
  })

  test("creates, updates only its block and remains idempotent", async () => {
    const root = await fixture()
    const file = path.join(root, "AGENTS.md")
    expect(JSON.parse((await run([root, "--write", "--json"])).stdout).data.instructions.status).toBe("created")
    const block = await fs.readFile(bootstrap, "utf8")
    expect(await fs.readFile(file, "utf8")).toBe(block)
    const prefix = "# Team rules\r\nKeep these bytes.\r\n\r\n"
    const suffix = "\n## Other framework\nKeep this too.\n"
    await fs.writeFile(file, prefix + block.replace("## minista", "## old guide") + suffix)
    expect(JSON.parse((await run([root, "--write", "--json"])).stdout).data.instructions.status).toBe("updated")
    expect(await fs.readFile(file, "utf8")).toBe(prefix + block + suffix)
    expect(JSON.parse((await run([root, "--write", "--json"])).stdout).data.instructions.status).toBe("unchanged")
    await fs.writeFile(file, prefix)
    await run([root, "--write"])
    expect((await fs.readFile(file, "utf8")).startsWith(prefix)).toBe(true)
  })

  test("returns structured errors and preserves ambiguous or linked instructions", async () => {
    const root = await fixture()
    const file = path.join(root, "AGENTS.md")
    const source = "# Mine\n<!-- minista:agents:start -->\nunfinished"
    await fs.writeFile(file, source)
    const result = await run([root, "--write", "--json"])
    expect(result.code).toBe(1)
    expect(JSON.parse(result.stdout)).toMatchObject({ ok: false, diagnostics: [{ code: "MINISTA_AGENTS_CONFLICT" }] })
    expect(await fs.readFile(file, "utf8")).toBe(source)
    await fs.rename(file, path.join(root, "rules.md"))
    await fs.symlink("rules.md", file)
    expect((await run([root, "--write", "--json"])).code).toBe(1)
    expect(await fs.readFile(file, "utf8")).toBe(source)
    const invalid = await run([root, "--unknown", "--json"])
    expect(JSON.parse(invalid.stdout).diagnostics[0].code).toBe("MINISTA_AGENTS_ARGS_INVALID")
  })

  test.each(["basic-js", "basic-ts", "minimal-js", "minimal-ts"])("scaffolds the common entry point for %s", async (template) => {
    const root = await fixture()
    const output = path.join(root, "project")
    await exec(process.execPath, [creator, output, "--template", template])
    expect(await fs.readFile(path.join(output, "AGENTS.md"), "utf8")).toBe(await fs.readFile(bootstrap, "utf8"))
  })
})
