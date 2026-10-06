import fs from "node:fs/promises"
import path from "node:path"
import { createHash } from "node:crypto"
import { execFileSync } from "node:child_process"
import { createRequire } from "node:module"
import { fileURLToPath, pathToFileURL } from "node:url"

export const targets = [
  { id: "main", branch: "main", node: "22.12.0", command: "docs-build" },
  { id: "v3", branch: "v3-archive", node: "20.19.0", command: "docs:build" },
  { id: "v4", branch: "v4-archive", node: "22.12.0", command: "docs-build" },
]
const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const git = (args, cwd = process.cwd()) =>
  execFileSync("git", args, { cwd, encoding: "utf8" }).trim()
const exists = async (file) => fs.access(file).then(() => true, () => false)
const json = async (file) => JSON.parse(await fs.readFile(file, "utf8"))
const writeJson = (file, data) => fs.writeFile(file, JSON.stringify(data, null, 2) + "\n")

export function relevant(file) {
  return /^(docs\/|packages\/minista\/|scripts\/|package(?:-lock)?\.json$)/.test(file)
}

async function revision() {
  const hash = createHash("sha256")
  for (const name of ["deploy.js", "archive-trigger.yml", "wrangler.jsonc"]) {
    hash.update(await fs.readFile(path.join(scriptDir, name)))
  }
  hash.update(await fs.readFile(path.resolve(scriptDir, "../../.github/workflows/cloudflare.yml")))
  return hash.digest("hex")
}

async function published() {
  const refs = git(["ls-remote", "--heads", "origin", "cloudflare"])
  if (!refs) return { sha: null, state: { schemaVersion: 1, targets: {} } }
  git(["fetch", "origin", "+refs/heads/cloudflare:refs/remotes/origin/cloudflare"])
  const sha = git(["rev-parse", "origin/cloudflare"])
  // An existing output branch without our state must be inspected, not silently replaced.
  const state = JSON.parse(git(["show", `${sha}:.deploy/state.json`]))
  if (state.schemaVersion !== 1 || !state.targets) throw new Error("Unsupported deployment state")
  return { sha, state }
}

async function plan() {
  const force = process.env.FORCE_TARGET || "auto"
  if (!["auto", "all", ...targets.map((t) => t.id)].includes(force)) throw new Error("Invalid target")
  const controller = git(["rev-parse", "HEAD"])
  for (const target of targets) {
    git(["fetch", "origin", `+refs/heads/${target.branch}:refs/remotes/origin/${target.branch}`])
  }
  const previous = await published()
  const toolRevision = await revision()
  const selected = []
  for (const target of targets) {
    const sha = git(["rev-parse", `origin/${target.branch}`])
    const old = previous.state.targets[target.id]
    let changed = force === "all" || force === target.id || !old || old.toolRevision !== toolRevision
    if (!changed && old.sha !== sha) {
      try {
        changed = git(["diff", "--name-only", old.sha, sha]).split("\n").some(relevant)
      } catch {
        // An unavailable historical SHA requires a fresh build.
        changed = true
      }
    }
    if (changed) selected.push({ ...target, sha, toolRevision })
  }
  await writeJson(".docs-plan.json", { schemaVersion: 1, controller, previous, selected })
  if (process.env.GITHUB_OUTPUT) {
    await fs.appendFile(process.env.GITHUB_OUTPUT,
      `matrix=${JSON.stringify({ include: selected })}\nchanged=${selected.length > 0}\ncontroller=${controller}\n`)
  }
  console.log("Docs to build:", selected.map((t) => t.id).join(", ") || "none")
}

async function prepare(source, id) {
  if (id === "main") return
  const config = path.join(source, "docs", id === "v3" ? "minista.config.ts" : "vite.config.ts")
  const text = await fs.readFile(config, "utf8")
  // These are archive-specific config shapes. Fail explicitly if the archived config changes.
  const marker = id === "v3" ? /defineConfig\(\{\s*\n/ : /return \{\s*\n\s*plugins:/
  if (!marker.test(text)) throw new Error(`Unsupported ${id} docs config`)
  const replacement = id === "v3"
    ? `defineConfig({\n  base: "/${id}/",\n`
    : `return {\n    base: "/${id}/",\n    plugins:`
  let updated = text.replace(marker, replacement)
  if (id === "v3") {
    // v3 applies base to SSG page.path before selecting search pages.
    if (!updated.includes('include: ["/docs/**/*"]') || !updated.includes('exclude: ["/docs/"]')) {
      throw new Error("Unsupported v3 search config")
    }
    updated = updated.replace('include: ["/docs/**/*"]', 'include: ["/v3/docs/**/*"]')
      .replace('exclude: ["/docs/"]', 'exclude: ["/v3/docs/"]')
  }
  await fs.writeFile(config, updated)
}

export function archiveUrl(value, id) {
  if (value && /^https:\/\/minista-archive-v[34]\.netlify\.app(?:\/|$)/.test(value)) {
    return value.replace(/^https:\/\/minista-archive-v([34])\.netlify\.app/, "/v$1")
  }
  if (!value || id === "main") return value
  if (id === "v3") {
    value = value.replace(/^\/(?:v3\/)?docs\/delivery(?=[/?#]|$)/, "/docs/delivery-support")
      .replace(/^\/(?:v3\/)?docs\/page(?=[/?#]|$)/, "/docs/pages")
  }
  const prefix = `/${id}`
  if (value === prefix || value.startsWith(prefix + "/")) return value
  if (value.startsWith("/") && !value.startsWith("//")) {
    // Version switches are shared across the site, not inside each archive.
    if (/^\/v[34](?:\/|[?#]|$)/.test(value)) return value
    return prefix + value
  }
  return value
}

export function siteUrl(value, id) {
  // Archived source branches still render metadata with the previous site origin.
  for (const origin of ["https://minista.qranoko.jp", "https://minista.dev"]) {
    if (value === origin || value.startsWith(origin + "/")) {
      return "https://minista.dev" + archiveUrl(value.slice(origin.length) || "/", id)
    }
  }
  return value
}

async function files(dir) {
  const result = []
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const name = path.join(dir, entry.name)
    if (entry.isSymbolicLink()) throw new Error(`Symlink in docs output: ${name}`)
    if (entry.isDirectory()) result.push(...await files(name))
    else result.push(name)
  }
  return result
}

async function finalize(source, id) {
  const dist = path.resolve(source, "docs/dist")
  if (!(await exists(path.join(dist, "index.html")))) throw new Error("Missing docs index.html")
  if (id === "main") {
    for (const name of ["v3", "v4"]) {
      if (await exists(path.join(dist, name))) throw new Error(`Reserved docs path: ${name}`)
    }
  }
  const require = createRequire(path.resolve(source, "docs/package.json"))
  const { parse } = require("node-html-parser")
  const output = await files(dist)
  for (const file of output) {
    if (file.endsWith(".html")) {
      const root = parse(await fs.readFile(file, "utf8"))
      for (const el of root.querySelectorAll("*")) {
        if (["CODE", "PRE", "SCRIPT", "STYLE"].includes(el.tagName) || el.closest("pre, code")) continue
        for (const attr of ["href", "src", "poster", "action", "data", "xlink:href"]) {
          const value = el.getAttribute(attr)
          if (value) el.setAttribute(attr, archiveUrl(value, id))
        }
        // Metadata is a site URL, not a documentation code example.
        if (el.tagName === "META" && /^og:(url|image)$/.test(el.getAttribute("property") || "")) {
          const value = el.getAttribute("content") || ""
          el.setAttribute("content", siteUrl(value, id))
        }
      }
      await fs.writeFile(file, root.toString())
    } else if (id === "v3" && file.endsWith(".json")) {
      const data = await json(file)
      // Keep v3 result paths under the archive even if an older builder omits base.
      if (Array.isArray(data.pages) && Array.isArray(data.words)) {
        if (!data.pages.length) throw new Error("Empty v3 search index")
        for (const page of data.pages) if (typeof page.path === "string") page.path = archiveUrl(page.path, id)
        await writeJson(file, data)
      }
    }
  }
  if (id !== "main") await validateArchive(dist, id, parse)
}

async function validateArchive(dist, id, parse) {
  const failures = new Set()
  for (const file of (await files(dist)).filter((name) => name.endsWith(".html"))) {
    const root = parse(await fs.readFile(file, "utf8"))
    for (const el of root.querySelectorAll("[href], [src], [poster]")) {
      if (el.closest("pre, code")) continue
      for (const attr of ["href", "src", "poster"]) {
        const value = el.getAttribute(attr)
        if (!value?.startsWith(`/${id}/`)) continue
        const local = decodeURIComponent(value.split(/[?#]/)[0].slice(id.length + 2))
        const candidate = path.resolve(dist, local)
        if (!candidate.startsWith(dist + path.sep) && candidate !== dist) throw new Error("Output URL escapes docs directory")
        const choices = [candidate, candidate + ".html", path.join(candidate, "index.html")]
        let found = false
        for (const name of choices) {
          if (await fs.stat(name).then((s) => s.isFile(), () => false)) { found = true; break }
        }
        if (!found) failures.add(`${path.relative(dist, file)}: ${value}`)
      }
    }
  }
  if (failures.size) throw new Error("Unresolved archive URLs:\n" + [...failures].join("\n"))
}

export async function mergeOutput(root, input, id) {
  const destination = id === "main" ? root : path.join(root, id)
  await fs.mkdir(root, { recursive: true })
  if (id === "main") {
    for (const reserved of ["v3", "v4"]) {
      if (await exists(path.join(input, reserved))) throw new Error(`Reserved docs path: ${reserved}`)
    }
    for (const entry of await fs.readdir(root)) {
      if (!["v3", "v4"].includes(entry)) await fs.rm(path.join(root, entry), { recursive: true, force: true })
    }
  } else {
    if (!["v3", "v4"].includes(id)) throw new Error("Invalid archive target")
    await fs.rm(destination, { recursive: true, force: true })
  }
  await fs.cp(input, destination, { recursive: true })
}

async function publish() {
  const plan = await json(".docs-artifacts/docs-plan/.docs-plan.json")
  if (plan.schemaVersion !== 1) throw new Error("Unsupported deployment plan")
  const latest = await published()
  if (latest.sha !== plan.previous.sha) throw new Error("cloudflare changed after planning; rerun the workflow")
  const checkout = path.resolve(".docs-publish")
  git(["worktree", "add", "--detach", checkout, latest.sha || "HEAD"])
  if (!latest.sha) {
    git(["checkout", "--orphan", "cloudflare"], checkout)
    git(["rm", "-rf", "."], checkout)
  }
  const state = latest.state
  for (const target of plan.selected) {
    const input = path.resolve(".docs-artifacts", `docs-${target.id}`)
    if (!(await exists(path.join(input, "index.html")))) throw new Error(`Missing ${target.id} artifact`)
    await mergeOutput(path.join(checkout, "public"), input, target.id)
    state.targets[target.id] = { sha: target.sha, toolRevision: target.toolRevision }
  }
  for (const name of ["index.html", "v3/index.html", "v4/index.html", "404.html"]) {
    if (!(await exists(path.join(checkout, "public", name)))) throw new Error(`Incomplete site: ${name}`)
  }
  // Workers Builds reads this file from the root of the output branch.
  // Keep it outside public so deployment state and configuration are not served.
  await fs.copyFile(path.join(scriptDir, "wrangler.jsonc"), path.join(checkout, "wrangler.jsonc"))
  await fs.mkdir(path.join(checkout, ".deploy"), { recursive: true })
  await writeJson(path.join(checkout, ".deploy/state.json"), state)
  git(["config", "user.name", "github-actions[bot]"], checkout)
  git(["config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"], checkout)
  git(["add", "-A"], checkout)
  if (!git(["diff", "--cached", "--name-only"], checkout)) return
  git(["commit", "-m", `Publish docs: ${plan.selected.map((t) => `${t.id}@${t.sha.slice(0, 7)}`).join(", ")}`], checkout)
  git(["push", "origin", "HEAD:refs/heads/cloudflare"], checkout)
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [command, source, id] = process.argv.slice(2)
  if (command === "plan") await plan()
  else if (command === "publish") await publish()
  else if (["prepare", "finalize"].includes(command) && targets.some((t) => t.id === id) && source) {
    if (command === "prepare") await prepare(source, id)
    else await finalize(source, id)
  } else throw new Error("Usage: deploy.js plan|publish|prepare <source> <target>|finalize <source> <target>")
}
