import type { PromptObject } from "prompts"
import fs from "fs-extra"
import fg from "fast-glob"
import { cac } from "cac"
import prompts from "prompts"
import pc from "picocolors"

const packages = [
  "package.json",
  "packages/minista/package.json",
  "packages/create-minista/package.json",
]
const templates = [
  "packages/create-minista/templates/minimal-js/package.json",
  "packages/create-minista/templates/minimal-ts/package.json",
]

function pkgVersion() {
  const pkgURL = new URL("../package.json", import.meta.url)
  const pkg = JSON.parse(fs.readFileSync(pkgURL, "utf8"))
  return pkg.version as string
}

async function rewriteVersion(oldVersion: string, newVersion: string) {
  const entryPoints = await fg([...packages, ...templates])

  await Promise.all(
    entryPoints.map(async (entryPoint) => {
      let pkg = JSON.parse(await fs.readFile(entryPoint, "utf8"))

      if (packages.includes(entryPoint)) {
        pkg.version = newVersion
      } else {
        pkg.devDependencies.minista = "^" + newVersion
      }
      await fs
        .outputJson(entryPoint, pkg, { spaces: 2 })
        .then(() => {
          console.log(`${pc.bold(pc.green("WRITE") + " " + entryPoint)}`)
        })
        .catch((err) => {
          console.error(err)
        })
    })
  )
  const toMessage = ` v${oldVersion} to v${newVersion}`
  console.log(pc.bold(pc.green("✔") + toMessage))
}

async function main(inlineVersion?: string) {
  const oldVersion = pkgVersion()
  const alphaSpliter = "-alpha."
  const verArray = oldVersion.split(alphaSpliter)
  const majorVersion = verArray[0]
  const alphaVersion = verArray[1]

  if (inlineVersion) {
    await rewriteVersion(oldVersion, inlineVersion)
    return
  }
  const questions: PromptObject[] = [
    {
      type: "select",
      name: "tag",
      message: "Which is the tag of the release?",
      choices: [
        { title: "Major", value: "major" },
        { title: "Alpha", value: "alpha" },
      ],
      initial: alphaVersion ? 1 : 0,
    },
    {
      type: "text",
      name: "majorVersion",
      message: "Major version:",
      initial: majorVersion,
    },
    {
      type: (_, values) => (values.tag === "major" ? null : "text"),
      name: "alphaVersion",
      message: "Alpha version:",
      initial: alphaVersion,
    },
  ]
  const res = (await prompts(questions)) as {
    tag: string
    majorVersion: number
    alphaVersion?: number
  }
  const alphaStr = res.alphaVersion ? alphaSpliter + res.alphaVersion : ""
  const newVersion = res.majorVersion + alphaStr

  await rewriteVersion(oldVersion, newVersion)
}

const cli = cac()

cli
  .command(
    "[...files] [version]",
    "Replace package.json versions of all packages"
  )
  .action(async (args: string[]) => {
    try {
      await main(args.length ? args[0] : "")
    } catch (err) {
      console.log(err)
      process.exit(1)
    }
  })

cli.help()
cli.parse()
