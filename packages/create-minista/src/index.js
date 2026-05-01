/** @typedef {import('prompts').PromptObject} PromptObject */
/**
 * @typedef {Object} CliOptions
 * @property {string} [template]
 * @property {string} [tag]
 */

import fs from "node:fs"
import path from "node:path"
import pc from "picocolors"
import { cac } from "cac"
import prompts from "prompts"
import degit from "degit"

/** @type {{ title: string, value: string }[]} */
const TEMPLATES = [
  { title: "Minimal (JavaScript)", value: "minimal-js" },
  { title: "Minimal (Typescript)", value: "minimal-ts" },
]

/**
 * @returns {string}
 */
function pkgVersion() {
  const pkgURL = new URL("../package.json", import.meta.url)
  const pkg = JSON.parse(fs.readFileSync(pkgURL, "utf8"))
  return pkg.version
}

/**
 * @param {string} dir
 */
function mkdirp(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true })
  } catch (e) {
    if (e instanceof Error && 'code' in e && e.code === "EEXIST") return
    throw e
  }
}

/**
 * @param {string} root
 * @param {CliOptions} options
 */
async function main(root, options) {
  console.log(`\n${pc.bold("create-minista")} ${pc.gray(`(v${pkgVersion()})`)}`)

  const cwd = root || "."
  const current = cwd === "."
  const repo = "qrac/minista/packages/create-minista/templates"
  const template = options.template || ""
  const tag = options.tag ? "#" + options.tag : ""

  /** @type {{ [key: string]: PromptObject }} */
  const questions = {
    overwrite: {
      type: "confirm",
      name: "overwrite",
      message: "Directory not empty. Continue [force overwrite]?",
      initial: false,
    },
    template: {
      type: "select",
      name: "template",
      message: "Which template would you like to use?",
      choices: TEMPLATES,
    },
  }

  if (fs.existsSync(cwd)) {
    if (fs.readdirSync(cwd).length > 0) {
      const { overwrite } = await prompts(questions.overwrite)
      if (!overwrite) process.exit(1)
      if (!current) mkdirp(cwd)
    }
  } else {
    if (!current) mkdirp(cwd)
  }

  const configs = template
    ? { template }
    : /** @type {{ template: string }} */ (await prompts(questions.template))

  const target = `${repo}/${configs.template}${tag}`
  const emitter = degit(target, { cache: false, force: true, verbose: false })

  try {
    console.log(`${pc.green(">")} ${pc.gray("Copying project files...")}`)
    await emitter.clone(cwd)
  } catch (err) {
    console.error(pc.red(err instanceof Error && err.message ? err.message : String(err)))
    process.exit(1)
  }

  console.log(pc.bold(pc.green("✔") + " Done!"))
  console.log("\nNext steps:")

  let step = 1

  const relative = path.relative(process.cwd(), cwd)
  if (relative !== "") {
    console.log(`  ${step++}: ${pc.bold(pc.cyan(`cd ${relative}`))}`)
  }

  console.log(`  ${step++}: ${pc.bold(pc.cyan("npm install"))}`)
  console.log(`  ${step++}: ${pc.bold(pc.cyan("npm run dev"))}`)
  console.log(`\nTo close the dev server, hit ${pc.bold(pc.cyan("Ctrl + C"))}`)
}

const cli = cac("create-minista")

cli
  .command("[root]", "Scaffolding for minista projects")
  .option("--template <template>", "[string] template directory")
  .option("--tag <tag>", "[string] branch | tag | hash")
  .action(async (root, options) => {
    try {
      await main(root, options)
    } catch (err) {
      console.log(err)
      process.exit(1)
    }
  })

cli.help()
cli.version(pkgVersion())
cli.parse()
