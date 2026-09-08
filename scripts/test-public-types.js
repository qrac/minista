import { execFileSync } from "node:child_process"
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, copyFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = fileURLToPath(new URL("../", import.meta.url))
const workspace = mkdtempSync(path.join(tmpdir(), "minista-public-types-"))
const npm = process.platform === "win32" ? "npm.cmd" : "npm"
const run = (command, args, cwd) => execFileSync(command, args, { cwd, stdio: "inherit" })
try {
  const packed = JSON.parse(execFileSync(npm, ["pack", "./packages/minista", "--json", "--pack-destination", workspace, "--ignore-scripts"], { cwd: root, encoding: "utf8" }))
  const manifest = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"))
  const react = "19"
  const consumer = path.join(workspace, `react-${react}`)
  mkdirSync(consumer)
  writeFileSync(path.join(consumer, "package.json"), JSON.stringify({ private: true, type: "module", dependencies: {
    minista: `file:../${packed[0].filename}`, react, "react-dom": react,
    "@types/react": react, "@types/react-dom": react,
    "@types/node": manifest.devDependencies["@types/node"],
    typescript: manifest.devDependencies.typescript, vite: manifest.devDependencies.vite,
  } }))
  run(npm, ["install", "--ignore-scripts", "--no-audit", "--no-fund"], consumer)
  copyFileSync(path.join(root, "packages/minista/test/public-types/consumer.tsx"), path.join(consumer, "consumer.tsx"))
  writeFileSync(path.join(consumer, "tsconfig.json"), JSON.stringify({ compilerOptions: {
    strict: true, skipLibCheck: false, noEmit: true, target: "ES2022", module: "ESNext",
    moduleResolution: "Bundler", jsx: "react-jsx", types: ["node", "react"],
  }, files: ["consumer.tsx"] }))
  console.log("Checking packed public types", Object.fromEntries(["react", "@types/react", "vite", "typescript"].map(name => [name, JSON.parse(readFileSync(path.join(consumer, "node_modules", name, "package.json"), "utf8")).version])))
  run(process.execPath, [path.join(consumer, "node_modules/typescript/bin/tsc"), "-p", "tsconfig.json"], consumer)
} finally {
  rmSync(workspace, { recursive: true, force: true })
}
