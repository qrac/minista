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

export function getRemoteExt(url: string) {
  const pathname = parseUrl(url).pathname || ""
  const parsedName = path.parse(pathname)
  return parsedName.ext.replace(/^\./, "") || ""
}

async function fetchRemote({
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

  const res = await fetch(url)

  if (!res.ok || !res.body) {
    console.error(res.statusText)
    return { url, fileName, data: "" }
  }
  contentType = res.headers.get("content-type") || ""

  extName = extension(contentType) || getRemoteExt(url)
  extName = extName === "jpeg" ? "jpg" : extName

  fileName = `${remoteName}-${remoteCount}.${extName}`
  fileName = path.join(outDir, fileName)

  const arrayBuffer = await res.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  return { url, fileName, data: buffer }
}

export async function transformRemote({
  remoteEls,
  config,
  tempRemotes,
}: {
  remoteEls: NHTMLElement[]
  config: ResolvedConfig
  tempRemotes: TempRemotes
}) {
  const { resolvedRoot, tempDir } = config.sub
  const { remoteName } = config.main.assets.images
  const outDir = path.join(tempDir, "images", "remote")

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
  return remoteEls.map((el) => {
    const remoteSrc = el.getAttribute("data-minista-image-src") || ""
    const fileName = tempRemotes[remoteSrc].fileName || ""
    const filePath = fileName.replace(resolvedRoot, "")
    el.setAttribute("data-minista-image-src", filePath)
    el.setAttribute("data-minista-transform-target", "image")
    return
  })
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
  const remoteEls = parsedHtml.querySelectorAll(
    `[data-minista-transform-target="remote"]`
  )
  await transformRemote({ remoteEls, config, tempRemotes })
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
  const remoteElsAll = parsedPages.map((page) => {
    return page.parsedHtml.querySelectorAll(
      `[data-minista-transform-target="remote"]`
    )
  })
  const remoteEls = remoteElsAll.flat()
  await transformRemote({ remoteEls, config, tempRemotes })
  return parsedPages
}
