import fs from "fs-extra"
import path from "path"

export async function emptyResolveDir(targetDir: string) {
  const targetUserDir = path.resolve(targetDir)
  return await fs.emptyDir(targetUserDir)
}
