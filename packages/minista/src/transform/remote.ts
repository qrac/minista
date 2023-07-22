import type { HTMLElement as NHTMLElement } from "node-html-parser"
import path from "node:path"
import fetch from "node-fetch"
import fs from "fs-extra"
import fg from "fast-glob"
import { extension } from "mime-types"

import type { ResolvedConfig } from "../config/index.js"
import type { CreateRemotes, CreatedRemotes } from "../generate/remote.js"
import { generateRemoteCache, generateRemotes } from "../generate/remote.js"
import { getElements } from "../utility/element.js"
import { getUniquePaths } from "../utility/path.js"

export function getRemoteExt(url: string) {
  const pathname = new URL(url).pathname || ""
  const parsedName = path.parse(pathname)
  return parsedName.ext.replace(/^\./, "") || ""
}

export async function fetchRemote({
  url,
  outDir,
  remoteName,
  remoteCount,
}: {
  url: string
  outDir: string
  remoteName: string
  remoteCount: number
}) {
  let fileName = ""
  let extName = ""
  let contentType = ""

  try {
    const res = await fetch(url)

    if (!res.ok || !res.body) {
      console.error(res.statusText)
      return { url, fileName, data: "" }
    }
    contentType = res.headers.get("Content-Type") || ""
    extName = extension(contentType) || getRemoteExt(url)
    extName = extName === "jpeg" ? "jpg" : extName
    fileName = `${remoteName}-${remoteCount}.${extName}`
    fileName = path.join(outDir, fileName)

    const arrayBuffer = await res.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    return { url, fileName, data: buffer }
  } catch (err) {
    console.log(err)
    return { url, fileName, data: "" }
  }
}

export async function transformRemotes({
  command,
  parsedData,
  config,
}: {
  command: "build" | "serve"
  parsedData: NHTMLElement | NHTMLElement[]
  config: ResolvedConfig
}) {
  const { resolvedRoot, tempDir } = config.sub
  const { remoteName } = config.main.assets.images

  const targetAttr = `[data-minista-transform-target="remote"]`
  const targetEls = getElements(parsedData, targetAttr)

  if (!targetEls.length) {
    return
  }
  const cacheDir = path.join(tempDir, "images", "remote")
  const cacheJson = path.join(tempDir, "images", "remote-cache.json")

  let cacheData: CreatedRemotes = {}
  let cacheCount = 0

  if (command === "serve") {
    if (await fs.pathExists(cacheJson)) {
      cacheData = await fs.readJSON(cacheJson)
    }
    cacheCount = (await fg(path.join(cacheDir, "*"))).length
  }

  const targetList = targetEls.map((el) => {
    return { el, src: el.getAttribute("data-minista-image-src") || "" }
  })

  const targetSrcs = getUniquePaths(
    targetList.map((item) => item.src),
    Object.keys(cacheData)
  )

  const fetchedRemotes = await Promise.all(
    targetSrcs
      .map(async (url, index) => {
        return await fetchRemote({
          url,
          outDir: cacheDir,
          remoteName,
          remoteCount: cacheCount + index + 1,
        })
      })
      .filter(async (item) => (await item).data)
  )

  if (fetchedRemotes.length > 0) {
    let createItems: CreateRemotes = []

    fetchedRemotes.map((item) => {
      createItems.push({
        url: item.url,
        fileName: item.fileName,
        data: item.data,
      })
      cacheData[item.url] = item.fileName.replace(resolvedRoot, "")
      return
    })
    await generateRemotes(createItems)

    if (command === "serve") {
      await generateRemoteCache(cacheJson, cacheData)
    }
  }

  targetList.map((item) => {
    const { el, src } = item
    const filePath = cacheData[src] || ""
    el.setAttribute("data-minista-image-src", filePath)
    el.setAttribute("data-minista-transform-target", "image")
    return
  })
}
