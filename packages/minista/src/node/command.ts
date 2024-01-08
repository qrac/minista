import { spawn } from "node:child_process"

function runViteCommand(args: string[]): Promise<number> {
  return new Promise((resolve, reject) => {
    const process = spawn("vite", args, { stdio: "inherit" })

    process.on("close", (code) => {
      if (code === 0) {
        resolve(code)
      } else {
        reject(new Error(`Process exited with code ${code}`))
      }
    })
  })
}

export async function runViteCommands(args: string[], isOneBuild?: boolean) {
  const isBuild = args.includes("build")

  try {
    if (isBuild) {
      !isOneBuild && (await runViteCommand([...args, "--ssr"]))
      await runViteCommand(args)
    } else {
      await runViteCommand(args)
    }
  } catch (error) {
    console.error(error)
  }
}
