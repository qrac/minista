import fs from "fs-extra"
import { cac } from "cac"

function printVersion() {
  const pkgURL = new URL("../package.json", import.meta.url)
  const pkg = JSON.parse(fs.readFileSync(pkgURL, "utf8"))
  const pkgVersion = pkg.version
  return pkgVersion
}

const cli = cac("minista")

cli
  .command("[root]")
  .alias("dev")
  .action(async () => {
    try {
      console.log("DEV")
    } catch (err) {
      console.log(err)
      process.exit(1)
    }
  })

cli.command("build [root]").action(async () => {
  try {
    console.log("BUILD")
  } catch (err) {
    console.log(err)
    process.exit(1)
  }
})

cli.command("preview [root]").action(async () => {
  try {
    console.log("PREVIEW")
  } catch (err) {
    console.log(err)
    process.exit(1)
  }
})

cli.help()
cli.version(printVersion())
cli.parse()
