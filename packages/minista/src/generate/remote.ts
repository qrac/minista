import fs from "fs-extra"

export type CreateRemotes = CreateRemote[]
type CreateRemote = {
  url: string
  fileName: string
  filePath: string
  data: string | Buffer
}

export type CreatedRemotes = {
  [url: string]: CreatedRemote
}
type CreatedRemote = {
  fileName: string
  filePath: string
}

export async function generateRemoteCache(
  fileName: string,
  createdRemotes: CreatedRemotes
) {
  if (Object.keys(createdRemotes).length > 0) {
    await fs
      .outputJson(fileName, createdRemotes, { spaces: 2 })
      .catch((err) => {
        console.error(err)
      })
  }
}

export async function generateRemotes(createRemotes: CreateRemotes) {
  if (createRemotes.length > 0) {
    await Promise.all(
      createRemotes.map(async (item) => {
        await fs.outputFile(item.fileName, item.data).catch((err) => {
          console.error(err)
        })
        return
      })
    )
  }
}
