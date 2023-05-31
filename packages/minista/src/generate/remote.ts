import fs from "fs-extra"

import { logger } from "../cli/logger.js"

export type CreatedRemotes = {
  [url: string]: string
}
export type CreateRemotes = {
  url: string
  fileName: string
  data: string | Buffer
}[]

export async function generateRemoteCache(
  fileName: string,
  data: CreatedRemotes
) {
  if (!Object.keys(data).length) {
    return
  }
  await fs.outputJson(fileName, data, { spaces: 2 }).catch((err) => {
    console.error(err)
  })
}

export async function generateRemotes(items: CreateRemotes) {
  if (!items.length) {
    return
  }
  await Promise.all(
    items.map(async (item) => {
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
