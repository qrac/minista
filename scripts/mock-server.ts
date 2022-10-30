import { cac } from "cac"
import colors from "picocolors"
import express from "express"
import { kill } from "cross-port-killer"

import issues from "./_data/issues.json"

type Options = {
  port: number
}

const cli = cac()

cli.option("--port [port]", "[number]", {
  default: 5174,
})

cli
  .command("start [files]", "Mock server started")
  .action((files: string, options: Options) => {
    try {
      const server = express()
      const apis = [
        {
          name: "Issues",
          path: "/issues",
          content: issues,
        },
      ]
      const nameLengths = apis.map((api) => api.name.length)
      const maxNameLength = nameLengths.reduce((a, b) => (a > b ? a : b), 0)

      apis.map((api) => {
        server.get(api.path, (req, res) => {
          res.json(api.content)
        })
      })

      server.listen(options.port, () => {
        console.log(colors.gray("Mock server started"))

        apis.map((api) => {
          const nameLength = api.name.length
          const spaceCount = maxNameLength - nameLength + 1
          const space = " ".repeat(spaceCount)

          console.log(
            colors.gray(
              `${api.name}:${space}http://localhost:${options.port}${api.path}`
            )
          )
        })
        console.log()
      })
    } catch (err) {
      console.log(err)
      process.exit(1)
    }
  })

cli
  .command("close [files]", "Mock server closed")
  .action((files: string, options: Options) => {
    try {
      kill(options.port).then((pids) => {
        console.log(colors.gray("Mock server closed"))
        console.log(colors.gray(`port: ${options.port}, pids: ${pids}`))
      })
    } catch (err) {
      console.log(err)
      process.exit(1)
    }
  })

cli.help()
cli.parse()
