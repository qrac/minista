import fs from "fs-extra"

export async function generatePublic(publicDir: string, outDir: string) {
  const hasPublic = await fs.pathExists(publicDir)

  if (hasPublic) {
    return await fs.copy(publicDir, outDir).catch((err) => {
      console.error(err)
    })
  } else {
    return
  }
}
