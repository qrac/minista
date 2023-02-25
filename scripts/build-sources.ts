import path from "node:path"
import fg from "fast-glob"
import { cac } from "cac"
import { bold, green } from "picocolors"
import { build } from "esbuild"
import pathgae from "pathgae"

type Options = {
  entryPoints: string
  outBase: string
  outDir: string
}

const cli = cac()

cli
  .command("[...files]", "Build TypeScript source code into JavaScript")
  .option("--entryPoints [entryPoints]", "[string | string[]]", {
    default: ["src/**/*.{ts,tsx}", "!src/@types"],
  })
  .option("--outBase [outBase]", "[string]", { default: "src" })
  .option("--outDir [outDir]", "[string]", { default: "dist" })
  .action(async (files: string, options: Options) => {
    try {
      const pkgDir = process.cwd().substring(process.cwd().indexOf("packages"))
      const entryPoints = await fg(options.entryPoints)

      await build({
        entryPoints: entryPoints,
        outbase: options.outBase,
        outdir: options.outDir,
        format: "esm",
        platform: "node",
        //logLevel: "info",
      })
        .then(() => {
          entryPoints.map((entryPoint) => {
            const outPath = pathgae(entryPoint, {
              outBase: options.outBase,
              outDir: options.outDir,
              outExt: "js",
            })
            console.log(
              `${bold(green("BUILD"))} ${bold(path.join(pkgDir, outPath))}`
            )
          })
        })
        .catch(() => process.exit(1))
    } catch (err) {
      console.log(err)
      process.exit(1)
    }
  })

cli.parse()
