import fs from "fs-extra"
import fg from "fast-glob"
import { cac } from "cac"
import colors from "picocolors"

const cli = cac()
const pkgs = ["packages/minista/package.json"]

cli
  .command(
    "[...files] <newVersion>",
    "Replace package.json versions of all packages"
  )
  .action(async (newVersion: string) => {
    try {
      const entryPoints = await fg(pkgs)

      await Promise.all(
        entryPoints.map(async (entryPoint) => {
          const pkg = JSON.parse(await fs.readFile(entryPoint, "utf8"))
          pkg.version = newVersion

          await fs
            .outputJson(entryPoint, pkg, { spaces: 2 })
            .then(() => {
              console.log(
                `${colors.bold(colors.green("WRITE"))} ${colors.bold(
                  entryPoint
                )} (${newVersion})`
              )
            })
            .catch((err) => {
              console.error(err)
            })
        })
      )
    } catch (err) {
      console.log(err)
      process.exit(1)
    }
  })

cli.help()
cli.parse()