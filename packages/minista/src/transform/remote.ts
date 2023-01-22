import type { HTMLElement as NHTMLElement } from "node-html-parser"
import path from "node:path"
import { parse as parseUrl } from "node:url"
import fetch from "node-fetch"
import fs from "fs-extra"
import fg from "fast-glob"
import { extension } from "mime-types"

import type { ResolvedConfig } from "../config/index.js"
import type { CreateRemotes, CreatedRemotes } from "../generate/remote.js"
import { generateRemoteCache, generateRemotes } from "../generate/remote.js"
import { getElements } from "../utility/element.js"
import { getUniquePaths } from "../utility/path.js"

export function getRemoteList(elements: NHTMLElement[]) {
  const list = elements.map((el) => {
    return { el: el, src: el.getAttribute("data-minista-image-src") || "" }
  })
  return list.filter((item) => item.src)
}

export function getRemoteExt(url: string) {
  const pathname = parseUrl(url).pathname || ""
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
  const targetAttr = `[data-minista-transform-target="remote"]`
  const remoteEls = getElements(parsedData, targetAttr)

  if (remoteEls.length === 0) {
    return
  }
  const { resolvedRoot, tempDir } = config.sub
  const { remoteName } = config.main.assets.images
  const outDir = path.join(tempDir, "images", "remote")
  const cacheFile = path.join(tempDir, "images", "remote-cache.json")

  let createRemotes: CreateRemotes = []
  let createdRemotes: CreatedRemotes = {}

  if (command === "serve") {
    if (await fs.pathExists(cacheFile)) {
      createdRemotes = await fs.readJSON(cacheFile)
    }
  }
  const count = (await fg(path.join(outDir, "*"))).length
  const remoteList = getRemoteList(remoteEls)
  const remoteUrls = remoteList.map((item) => item.src)
  const excludesUrls = Object.keys(createdRemotes)
  const fetchUrls = getUniquePaths(remoteUrls, excludesUrls)

  const fetchedRemotes = await Promise.all(
    fetchUrls
      .map(async (url, index) => {
        return await fetchRemote({
          url,
          outDir,
          remoteName,
          remoteCount: count + index + 1,
        })
      })
      .filter(async (item) => (await item).data)
  )

  if (fetchedRemotes.length > 0) {
    fetchedRemotes.map((item) => {
      createRemotes.push({
        url: item.url,
        fileName: item.fileName,
        data: item.data,
      })
      createdRemotes[item.url] = item.fileName.replace(resolvedRoot, "")
      return
    })
    await generateRemotes(createRemotes)

    if (command === "serve") {
      await generateRemoteCache(cacheFile, createdRemotes)
    }
  }
  remoteList.map((item) => {
    const filePath = createdRemotes[item.src] || ""
    item.el.setAttribute("data-minista-image-src", filePath)
    item.el.setAttribute("data-minista-transform-target", "image")
    return
  })
}
