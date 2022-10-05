import type { CorsOptions } from "vite"
import fs from "fs-extra"
import { cac } from "cac"

const cli = cac("minista")

type GlobalCliOptions = {
  "--"?: string[]
  c?: string | false
  config?: string | false
  base?: string
}
type DevelopCliOptions = {
  host?: string | boolean
  port?: number
  strictPort?: boolean
  https?: boolean
  open?: boolean | string
  cors?: boolean | CorsOptions
}
type BuildCliOptions = {}
type PreviewCliOptions = {
  host?: string | boolean
  port?: number
  strictPort?: boolean
  https?: boolean
  open?: boolean | string
}

function pkgVersion() {
  const pkgURL = new URL("../../package.json", import.meta.url)
  const pkg = JSON.parse(fs.readFileSync(pkgURL, "utf8"))
  return pkg.version
}

cli
  .option("-c, --config <file>", `[string] use specified config file`)
  .option("--base <path>", `[string] public base path (default: /)`)

cli
  .command("[root]", "start dev server")
  .alias("develop")
  .alias("dev")
  .alias("serve")
  .option("--host [host]", "[string] specify hostname")
  .option("--port <port>", "[number] specify port")
  .option("--strictPort", "[boolean] exit if specified port is already in use")
  .option("--https", "[boolean] use TLS + HTTP/2")
  .option("--open [path]", "[boolean | string] open browser on startup")
  .option("--cors", "[boolean] enable CORS")
  .action(
    async (root: string, options: GlobalCliOptions & DevelopCliOptions) => {
      try {
        const { develop } = await import("./develop.js")
        await develop({
          configFile: options.config,
          root: root,
          base: options.base,
          vite: {
            server: {
              host: options.host,
              port: options.port,
              strictPort: options.strictPort,
              https: options.https,
              open: options.open,
              cors: options.cors,
            },
          },
        })
      } catch (err) {
        console.log(err)
        process.exit(1)
      }
    }
  )

cli
  .command("build [root]", "build for production")
  .action(async (root: string, options: GlobalCliOptions & BuildCliOptions) => {
    try {
      const { build } = await import("./build.js")
      await build({
        configFile: options.config,
        root: root,
        base: options.base,
      })
    } catch (err) {
      console.log(err)
      process.exit(1)
    }
  })

cli
  .command("preview [root]", "locally preview production build")
  .option("--host [host]", "[string] specify hostname")
  .option("--port <port>", "[number] specify port")
  .option("--strictPort", "[boolean] exit if specified port is already in use")
  .option("--https", "[boolean] use TLS + HTTP/2")
  .option("--open [path]", "[boolean | string] open browser on startup")
  .action(
    async (root: string, options: GlobalCliOptions & PreviewCliOptions) => {
      try {
        const { preview } = await import("./preview.js")
        await preview({
          configFile: options.config,
          root: root,
          base: options.base,
          vite: {
            server: {
              host: options.host,
              port: options.port,
              strictPort: options.strictPort,
              https: options.https,
              open: options.open,
            },
          },
        })
      } catch (err) {
        console.log(err)
        process.exit(1)
      }
    }
  )

cli.help()
cli.version(pkgVersion())
cli.parse()
