import { spawn } from "cross-spawn"

/**
 * @param {string[]} args
 * @returns {Promise<number>}
 */
async function runVite(args) {
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

/**
 * @param {string[]} args
 * @param {boolean} [isOneBuild]
 * @returns {Promise<void>}
 */
export async function runMinista(args, isOneBuild) {
  const isBuild = args.includes("build")

  try {
    if (isBuild && !isOneBuild) {
      await runVite([...args, "--ssr"])
    }
    await runVite(args)
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
}
