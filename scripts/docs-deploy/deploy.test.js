import assert from "node:assert/strict"
import { test } from "node:test"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { execFileSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { archiveUrl, mergeOutput, relevant, siteUrl, sourceChanged } from "./deploy.js"

test("latest docs replacement keeps archives and removes obsolete latest files", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "minista-docs-deploy-"))
  try {
    const output = path.join(dir, "public")
    const input = path.join(dir, "input")
    await fs.mkdir(path.join(output, "v3"), { recursive: true })
    await fs.mkdir(path.join(output, "v4"), { recursive: true })
    await fs.mkdir(input)
    await fs.writeFile(path.join(output, "v3/index.html"), "v3")
    await fs.writeFile(path.join(output, "v4/index.html"), "v4")
    await fs.writeFile(path.join(output, "obsolete.html"), "old")
    await fs.writeFile(path.join(input, "index.html"), "latest")
    await mergeOutput(output, input, "main")
    assert.equal(await fs.readFile(path.join(output, "v3/index.html"), "utf8"), "v3")
    assert.equal(await fs.readFile(path.join(output, "v4/index.html"), "utf8"), "v4")
    assert.equal(await fs.readFile(path.join(output, "index.html"), "utf8"), "latest")
    await assert.rejects(fs.access(path.join(output, "obsolete.html")))
    await fs.writeFile(path.join(input, "index.html"), "new v3")
    await mergeOutput(output, input, "v3")
    assert.equal(await fs.readFile(path.join(output, "index.html"), "utf8"), "latest")
    assert.equal(await fs.readFile(path.join(output, "v4/index.html"), "utf8"), "v4")
    assert.equal(await fs.readFile(path.join(output, "v3/index.html"), "utf8"), "new v3")
    await fs.mkdir(path.join(input, "v4"))
    await assert.rejects(mergeOutput(output, input, "main"), /Reserved docs path/)
    assert.equal(await fs.readFile(path.join(output, "index.html"), "utf8"), "latest")
  } finally {
    await fs.rm(dir, { recursive: true, force: true })
  }
})

test("archive URLs preserve suffixes, external URLs and version switches", () => {
  assert.equal(archiveUrl("/docs/setup?x=1#install", "v3"), "/v3/docs/setup?x=1#install")
  assert.equal(archiveUrl("/v3/docs/", "v3"), "/v3/docs/")
  assert.equal(archiveUrl("/v4/", "v3"), "/v4/")
  assert.equal(archiveUrl("//example.com/logo.svg", "v4"), "//example.com/logo.svg")
  assert.equal(archiveUrl("https://example.com/", "v4"), "https://example.com/")
  assert.equal(archiveUrl("#heading", "v4"), "#heading")
  assert.equal(archiveUrl("/favicon.png", "main"), "/favicon.png")
  assert.equal(archiveUrl("/docs/page#pageprops", "v3"), "/v3/docs/pages#pageprops")
  assert.equal(archiveUrl("/v3/docs/delivery", "v3"), "/v3/docs/delivery-support")
  assert.equal(archiveUrl("https://minista-archive-v3.netlify.app/docs/", "v4"), "/v3/docs/")
  assert.equal(archiveUrl("https://minista-archive-v4.netlify.app/", "main"), "/v4/")
})

test("metadata uses minista.dev and applies the archive prefix once", () => {
  assert.equal(siteUrl("https://minista.qranoko.jp/docs/setup", "v3"), "https://minista.dev/v3/docs/setup")
  assert.equal(siteUrl("https://minista.qranoko.jp/v3/docs/setup", "v3"), "https://minista.dev/v3/docs/setup")
  assert.equal(siteUrl("https://minista.dev/ogp.png", "v4"), "https://minista.dev/v4/ogp.png")
  assert.equal(siteUrl("https://minista.dev/v4/ogp.png", "v4"), "https://minista.dev/v4/ogp.png")
  assert.equal(siteUrl("https://minista.dev/ja/docs/", "main"), "https://minista.dev/ja/docs/")
  assert.equal(siteUrl("https://example.com/ogp.png", "v3"), "https://example.com/ogp.png")
})

test("publication bootstraps all targets and reconciles changes since the last successful build", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "minista-docs-reconcile-"))
  const repo = path.join(dir, "source")
  const remote = path.join(dir, "remote.git")
  const runGit = (...args) => execFileSync("git", args, { cwd: repo, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim()
  const run = (command, env = {}) => execFileSync(process.execPath, ["scripts/docs-deploy/deploy.js", command], {
    cwd: repo, encoding: "utf8", env: { ...process.env, FORCE_TARGET: "auto", GITHUB_OUTPUT: "", ...env }, stdio: ["ignore", "pipe", "pipe"],
  })
  try {
    await fs.mkdir(repo)
    execFileSync("git", ["init", "--bare", remote], { stdio: "ignore" })
    runGit("init", "-b", "main")
    runGit("config", "user.name", "Docs test")
    runGit("config", "user.email", "docs@example.test")
    await fs.mkdir(path.join(repo, ".github/workflows"), { recursive: true })
    await fs.cp(path.dirname(fileURLToPath(import.meta.url)), path.join(repo, "scripts/docs-deploy"), { recursive: true })
    await fs.copyFile(fileURLToPath(new URL("../../.github/workflows/cloudflare.yml", import.meta.url)), path.join(repo, ".github/workflows/cloudflare.yml"))
    await fs.writeFile(path.join(repo, "package.json"), '{"type":"module","version":"1.0.0"}\n')
    await fs.mkdir(path.join(repo, "docs"))
    await fs.writeFile(path.join(repo, "docs/content.txt"), "first")
    runGit("add", ".")
    runGit("commit", "-m", "Initial sources")
    runGit("branch", "v3-archive")
    runGit("branch", "v4-archive")
    runGit("remote", "add", "origin", remote)
    runGit("push", "origin", "main", "v3-archive", "v4-archive")
    run("plan")
    const initial = JSON.parse(await fs.readFile(path.join(repo, ".docs-plan.json"), "utf8"))
    assert.deepEqual(initial.selected.map((t) => t.id), ["main", "v3", "v4"])
    const artifacts = path.join(repo, ".docs-artifacts")
    await fs.mkdir(path.join(artifacts, "docs-plan"), { recursive: true })
    await fs.copyFile(path.join(repo, ".docs-plan.json"), path.join(artifacts, "docs-plan/.docs-plan.json"))
    for (const id of ["main", "v3", "v4"]) {
      await fs.mkdir(path.join(artifacts, `docs-${id}`))
      await fs.writeFile(path.join(artifacts, `docs-${id}/index.html`), id)
    }
    await fs.writeFile(path.join(artifacts, "docs-main/404.html"), "404")
    run("publish")
    const worker = JSON.parse(runGit("show", "origin/cloudflare:wrangler.jsonc"))
    assert.equal(worker.name, "minista")
    assert.equal(worker.assets.directory, "./public")
    assert.equal(worker.assets.html_handling, "auto-trailing-slash")
    assert.equal(worker.assets.not_found_handling, "404-page")
    assert.equal(worker.preview_urls, false)
    assert.throws(() => runGit("show", "origin/cloudflare:public/wrangler.jsonc"))
    run("plan")
    const unchanged = JSON.parse(await fs.readFile(path.join(repo, ".docs-plan.json"), "utf8"))
    assert.equal(unchanged.selected.length, 0)
    const before = runGit("rev-parse", "HEAD")
    await fs.writeFile(path.join(repo, "package.json"), '{"type":"module","version":"1.0.0","description":"updated"}\n')
    await fs.writeFile(path.join(repo, "package-lock.json"), "{}\n")
    await fs.mkdir(path.join(repo, "packages/minista/src"), { recursive: true })
    await fs.writeFile(path.join(repo, "packages/minista/src/node.js"), "export {}\n")
    runGit("add", "package.json", "package-lock.json", "packages")
    runGit("commit", "-m", "Update runtime and package metadata without release")
    runGit("push", "origin", "main")
    const metadata = runGit("rev-parse", "HEAD")
    assert.equal(sourceChanged(before, metadata, "main", repo), false)
    assert.equal(sourceChanged(before, metadata, "v4", repo), true)
    run("plan")
    assert.equal(JSON.parse(await fs.readFile(path.join(repo, ".docs-plan.json"), "utf8")).selected.length, 0)
    const eventFile = path.join(dir, "event.json")
    const outputFile = path.join(dir, "output.txt")
    const checkTrigger = async (event, expected, eventName = "push") => {
      await fs.writeFile(eventFile, JSON.stringify(event))
      await fs.writeFile(outputFile, "")
      run("trigger", { GITHUB_EVENT_NAME: eventName, GITHUB_EVENT_PATH: eventFile, GITHUB_OUTPUT: outputFile })
      assert.equal(await fs.readFile(outputFile, "utf8"), `changed=${expected}\n`)
    }
    await checkTrigger({ before, after: metadata }, false)
    await fs.writeFile(path.join(repo, "package.json"), '{"type":"module","version":"1.1.0"}\n')
    runGit("add", "package.json")
    runGit("commit", "-m", "Release version")
    runGit("push", "origin", "main")
    const release = runGit("rev-parse", "HEAD")
    await checkTrigger({ before: metadata, after: release }, true)
    run("plan")
    assert.deepEqual(JSON.parse(await fs.readFile(path.join(repo, ".docs-plan.json"), "utf8")).selected.map((t) => t.id), ["main"])
    await checkTrigger({ before: "0".repeat(40), after: release }, true)
    await checkTrigger({}, true, "workflow_dispatch")
    await checkTrigger({}, true, "repository_dispatch")
    await fs.writeFile(path.join(repo, "docs/content.txt"), "second")
    runGit("add", "docs/content.txt")
    runGit("commit", "-m", "Update main docs")
    runGit("push", "origin", "main")
    await checkTrigger({ before: release, after: runGit("rev-parse", "HEAD") }, true)
    run("plan")
    const updated = JSON.parse(await fs.readFile(path.join(repo, ".docs-plan.json"), "utf8"))
    assert.deepEqual(updated.selected.map((t) => t.id), ["main"])
    // A concurrently changed destination is rejected before touching its files.
    await fs.copyFile(path.join(repo, ".docs-plan.json"), path.join(artifacts, "docs-plan/.docs-plan.json"))
    const deployment = path.join(repo, ".docs-publish")
    await fs.writeFile(path.join(deployment, "public/external.txt"), "external update")
    for (const args of [["add", "."], ["commit", "-m", "External deployment change"], ["push", "origin", "HEAD:cloudflare"]]) {
      execFileSync("git", args, { cwd: deployment, stdio: "ignore" })
    }
    assert.throws(() => run("publish"))
  } finally {
    await fs.rm(dir, { recursive: true, force: true })
  }
})

test("main selects docs, scripts and its workflow; archives keep runtime and dependency selection", () => {
  for (const file of ["docs/src/pages/index.tsx", "scripts/build-sources.ts", ".github/workflows/cloudflare.yml"]) assert.ok(relevant(file))
  for (const file of ["README.md", "context/README.md", "packages/minista/src/node.js", "package.json", "package-lock.json", "packages/create-minista/README.md"]) assert.ok(!relevant(file))
  for (const file of ["packages/minista/src/node.js", "package.json", "package-lock.json"]) assert.ok(relevant(file, "v3"))
})
