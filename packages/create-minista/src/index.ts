import type { PromptObject } from "prompts"
import fs from "node:fs"
import path from "node:path"
import pc from "picocolors"
import { cac } from "cac"
import prompts from "prompts"
import degit from "degit"

type CliOptions = {
  "--"?: string[]
  template?: string
  tag?: string
}

const TEMPLATES = [
  {
    title: "Minimal (JavaScript)",
    value: "minimal-js",
  },
  {
    title: "Minimal (Typescript)",
    value: "minimal-ts",
  },
]

function pkgVersion() {
  const pkgURL = new URL("../package.json", import.meta.url)
  const pkg = JSON.parse(fs.readFileSync(pkgURL, "utf8"))
  return pkg.version as string
}

function mkdirp(dir: string) {
  try {
    fs.mkdirSync(dir, { recursive: true })
  } catch (e: any) {
    if (e.code === "EEXIST") return
    throw e
  }
}

async function main(root: string, options: CliOptions) {
  console.log(`\n${pc.bold("create-minista")} ${pc.gray(`(v${pkgVersion()})`)}`)

  const cwd = root || "."
  const current = cwd === "."
  const repo = "qrac/minista/packages/create-minista/templates"
  const template = options.template || ""
  const tag = options.tag ? "#" + options.tag : ""

  const questions: { [key: string]: PromptObject } = {
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
      const { overwrite } = (await prompts(questions.overwrite)) as {
        overwrite: boolean
      }
      if (!overwrite) {
        process.exit(1)
      }
      !current && mkdirp(cwd)
    }
  } else {
    !current && mkdirp(cwd)
  }

  const configs = {
    ...(template ? { template } : await prompts(questions.template)),
  } as { template: string }

  const target = `${path.join(repo, configs.template)}${tag}`
  const emitter = degit(target, { cache: false, force: true, verbose: false })

  try {
    console.log(`${pc.green(`>`)} ${pc.gray(`Copying project files...`)}`)
    await emitter.clone(cwd)
  } catch (err: any) {
    console.error(pc.red(err.message))
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
  .option("--template <template>", "[string] template direcroty")
  .option("--tag <tag>", "[string] branch | tag | hash")
  .action(async (root: string, options: CliOptions) => {
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
