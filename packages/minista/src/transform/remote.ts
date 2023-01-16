import type { HTMLElement as NHTMLElement } from "node-html-parser"
import path from "node:path"
import { parse as parseUrl } from "node:url"
import { fetch } from "undici"
import fg from "fast-glob"
import { extension } from "mime-types"

import type { ResolvedConfig } from "../config/index.js"
import type { ParsedPage } from "../cli/build.js"
import type { TempRemotes } from "../generate/remote.js"
import { generateTempRemote } from "../generate/remote.js"

export function getRemoteFileName(url: string) {
  const pathname = parseUrl(url).pathname || ""
  const parsedName = path.parse(pathname)
  const fileName = parsedName.base
  const hasExt = parsedName.ext

  return hasExt ? fileName : ""
}

export function getRemoteFileExt(url: string) {
  const pathname = parseUrl(url).pathname || ""
  const parsedName = path.parse(pathname)

  return parsedName.ext.replace(/^\./, "") || ""
}

export function splitRemoteUrls(remoteUrls: string[]) {
  const hasNameUrls = remoteUrls.filter((url) => {
    return getRemoteFileName(url)
  })
  const noNameUrls = remoteUrls.filter((url) => {
    return !hasNameUrls.includes(url)
  })
  return { hasNameUrls, noNameUrls }
}

async function fetchRemote({
  url,
  outDir,
  remoteName,
  remoteCount,
}: {
  url: string
  outDir: string
  remoteName?: string
  remoteCount?: number
}) {
  let fileName = ""
  let extName = ""
  let contentType = ""

  const res = await fetch(url)

  if (!res.ok || !res.body) {
    console.error(res.statusText)
    return { url, fileName, data: "" }
  }
  contentType = res.headers.get("content-type") || ""
  extName = extension(contentType) || getRemoteFileExt(url)
  extName = extName === "jpeg" ? "jpg" : extName

  if (remoteName && remoteCount) {
    fileName = `${remoteName}-${remoteCount}.${extName}`
  } else {
    fileName = getRemoteFileName(url)
  }
  if (!fileName) {
    return { url, fileName, data: "" }
  }
  fileName = path.join(outDir, fileName)

  const arrayBuffer = await res.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  return { url, fileName, data: buffer }
}

export async function transformRemotes({
  parsedHtml,
  config,
  tempRemotes,
}: {
  parsedHtml: NHTMLElement
  config: ResolvedConfig
  tempRemotes: TempRemotes
}) {
  const { tempDir } = config.sub
  const { remoteName } = config.main.assets.images
  const outDir = path.join(tempDir, "images", "remote")

  const remoteEls = parsedHtml.querySelectorAll(
    `[data-minista-transform-target="remote"]`
  )
  const remoteSrcs = remoteEls.map((el) => {
    el.setAttribute("data-minista-transform-target", "image")
    return el.getAttribute("data-minista-image-src") || ""
  })
  const remoteUrls = [...new Set(remoteSrcs)].sort()
  const createUrls = remoteUrls.filter((url) => {
    return !Object.hasOwn(tempRemotes, url)
  })
  const tempCount = (await fg(path.join(outDir, "*"))).length

  const createRemotes = await Promise.all(
    createUrls.map(async (url, index) => {
      return await fetchRemote({
        url,
        outDir,
        remoteName,
        remoteCount: tempCount + index + 1,
      })
    })
  )
  await Promise.all(
    createRemotes.map(async (item) => {
      return await generateTempRemote({
        url: item.url,
        fileName: item.fileName,
        data: item.data,
        tempRemotes,
      })
    })
  )
  return parsedHtml
}

export async function transformRemotesAll({
  parsedPages,
  config,
  tempRemotes,
}: {
  parsedPages: ParsedPage[]
  config: ResolvedConfig
  tempRemotes: TempRemotes
}) {
  const { tempDir } = config.sub
  const { remoteName } = config.main.assets.images
  const outDir = path.join(tempDir, "images", "remote")

  const remoteSrcsAll = parsedPages.map((page) => {
    const remoteEls = page.parsedHtml.querySelectorAll(
      `[data-minista-transform-target="remote"]`
    )
    const remoteSrcs = remoteEls.map((el) => {
      el.setAttribute("data-minista-transform-target", "image")
      return el.getAttribute("data-minista-image-src") || ""
    })
    return remoteSrcs
  })
  const remoteUrls = [...new Set(remoteSrcsAll.flat())].sort()
  const { hasNameUrls, noNameUrls } = splitRemoteUrls(remoteUrls)

  const hasNameRemotes = await Promise.all(
    hasNameUrls.map(async (url) => {
      return await fetchRemote({
        url,
        outDir,
      })
    })
  )
  const noNameRemotes = await Promise.all(
    noNameUrls.map(async (url, index) => {
      return await fetchRemote({
        url,
        outDir,
        remoteName,
        remoteCount: index + 1,
      })
    })
  )
  const createRemotes = [...hasNameRemotes, ...noNameRemotes]

  await Promise.all(
    createRemotes.map(async (item) => {
      return await generateTempRemote({
        url: item.url,
        fileName: item.fileName,
        data: item.data,
        tempRemotes,
      })
    })
  )
  return parsedPages
}
