import fs from "fs-extra"

export type TempRemotes = {
  [url: string]: TempRemote
}
type TempRemote = {
  fileName: string
}

export async function generateTempRemote({
  url,
  fileName,
  data,
  tempRemotes,
}: {
  url: string
  fileName: string
  data: string | Buffer
  tempRemotes: TempRemotes
}) {
  return await fs
    .outputFile(fileName, data)
    .then(() => {
      tempRemotes[url] = { fileName }
    })
    .catch((err) => {
      console.error(err)
    })
}
