import fs from "fs-extra"
import path from "path"

export async function emptyResolveDir(targetDir: string) {
  const targetUserDir = path.resolve(targetDir)
  fs.emptyDir(targetUserDir)
}
