import fs from "fs-extra"
import pc from "picocolors"
import fetch from "node-fetch"
import { extension } from "mime-types"
import { parse as parseHtml } from "node-html-parser"
import { parseSrcset } from "srcset"

import { slashEnd } from "./utils.js"

export async function downloadFiles(
  entryPoints: string[],
  remoteUrl: string[],
  remoteName: string,
  downloadOutDir: string,
  downloadOutHref: string
) {
  const targetPages: { entryPoint: string; remoteImgUrls: string[] }[] = []
  const imgSrcUrls: string[][] = []
  const imgSrcList: { remoteImgUrl: string; localImgUrl: string }[] = []

  await Promise.all(
    entryPoints.map(async (entryPoint) => {
      const pageImgSrcUrls = []

      const html = await fs.readFile(entryPoint, "utf8")
      const parsedHtml = parseHtml(html)
      const imgTags = parsedHtml.getElementsByTagName("img")
      const sourceTags = parsedHtml.getElementsByTagName("source")

      if (imgTags.length > 0) {
        for (const item of imgTags) {
          const itemSrc = item.getAttribute("src")
          const itemSrcset = item.getAttribute("srcset")

          if (itemSrc && matchSrcUrls(itemSrc, remoteUrl)) {
            const srcUrls = getSrcObject(itemSrc)
            for (const srcUrl of srcUrls) {
              pageImgSrcUrls.push(srcUrl.url)
            }
          }
          if (itemSrcset && matchSrcUrls(itemSrcset, remoteUrl)) {
            const srcUrls = getSrcObject(itemSrcset)
            for (const srcUrl of srcUrls) {
              pageImgSrcUrls.push(srcUrl.url)
            }
          }
        }
      }

      if (sourceTags.length > 0) {
        for (const item of sourceTags) {
          const itemSrc = item.getAttribute("src")
          const itemSrcset = item.getAttribute("srcset")

          if (itemSrc && matchSrcUrls(itemSrc, remoteUrl)) {
            const srcUrls = getSrcObject(itemSrc)
            for (const srcUrl of srcUrls) {
              pageImgSrcUrls.push(srcUrl.url)
            }
          }
          if (itemSrcset && matchSrcUrls(itemSrcset, remoteUrl)) {
            const srcUrls = getSrcObject(itemSrcset)
            for (const srcUrl of srcUrls) {
              pageImgSrcUrls.push(srcUrl.url)
            }
          }
        }
      }

      const filterdPageImgSrcUrls = [...new Set(pageImgSrcUrls)]

      if (filterdPageImgSrcUrls.length > 0) {
        targetPages.push({
          entryPoint: entryPoint,
          remoteImgUrls: filterdPageImgSrcUrls,
        })
        imgSrcUrls.push(filterdPageImgSrcUrls)
      }

      return
    })
  )

  const flattenedImgSrcUrls = imgSrcUrls.flat()
  const filterdImgSrcUrls = [...new Set(flattenedImgSrcUrls)]

  await Promise.all(
    filterdImgSrcUrls.map(async (url, index) => {
      const res = await fetch(url)

      if (!res.ok) {
        console.error(
          `${pc.bold(pc.red("ERROR"))} ${pc.red(
            "Unexpected response: " + res.statusText
          )}`
        )
        return
      }

      if (!res.body) {
        console.error(
          `${pc.bold(pc.red("ERROR"))} ${pc.red(
            "Cannot detect file: " + res.statusText
          )}`
        )
        return
      }

      const contentType = res.headers.get("content-type")

      if (!contentType) {
        console.error(
          `${pc.bold(pc.red("ERROR"))} ${pc.red(
            "Cannot detect file extension: " + res.statusText
          )}`
        )
        return
      }

      const ext = extension(contentType)
      const fixedExt = ext === "jpeg" ? "jpg" : ext
      const localImgName =
        remoteName.replace(/\[index\]/g, `${index + 1}`) + `.${fixedExt}`
      const localImgUrl = slashEnd(downloadOutHref) + localImgName
      const localImgOutput = slashEnd(downloadOutDir) + localImgName

      imgSrcList.push({ remoteImgUrl: url, localImgUrl: localImgUrl })

      const fileStream = fs.createWriteStream(localImgOutput)
      res.body.pipe(fileStream)

      fileStream.on("finish", function () {
        console.log(`${pc.bold(pc.cyan("DLIMG"))} ${pc.bold(localImgOutput)}`)
      })

      return
    })
  )

  await Promise.all(
    targetPages.map(async (targetPage) => {
      const html = await fs.readFile(targetPage.entryPoint, "utf8")

      const joinedUrl = targetPage.remoteImgUrls.map((url) => {
        return url.replaceAll('&', "&amp;").replaceAll('?', "\\?")
      }).join("|");
      const reg = new RegExp(joinedUrl, "g")

      function replacer(match: string): string {
        const replaceData = imgSrcList.find(
          (item) => {
            const unescapedMatch = match.replaceAll('&amp;', '&')
            return item.remoteImgUrl === unescapedMatch
          }
        )
        const localImgUrl = replaceData?.localImgUrl || match
        return localImgUrl
      }

      const result = html.replace(reg, replacer)

      await fs
        .outputFile(targetPage.entryPoint, result)
        .then(() => {
          console.log(
            `${pc.bold(pc.cyan("REIMG"))} ${pc.bold(targetPage.entryPoint)}`
          )
        })
        .catch((err) => {
          console.error(err)
        })

      return
    })
  )

  return
}

export function getSrcObject(src: string) {
  const parsedSrc = parseSrcset(src)
  return parsedSrc
}

export function matchSrcUrls(src: string, urls: string[]) {
  const urlsStr = urls.join("|")
  const reg = new RegExp(urlsStr, "g")
  return src.match(reg)
}
