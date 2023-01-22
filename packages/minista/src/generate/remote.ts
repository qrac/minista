import fs from "fs-extra"

import { logger } from "../cli/logger.js"

export type CreateRemotes = {
  url: string
  fileName: string
  data: string | Buffer
}[]
export type CreatedRemotes = {
  [url: string]: string
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
        await fs
          .outputFile(item.fileName, item.data)
          .then(() => {
            logger({ label: "FETCH", main: item.url })
          })
          .catch((err) => {
            console.error(err)
          })
        return
      })
    )
  }
}
