import type { HTMLElement as NhpHTMLElement } from "node-html-parser"
import picomatch from "picomatch"
import { parse } from "node-html-parser"
import mojigiri from "mojigiri"

import type { ResolvedConfig } from "../config/index.js"
import type { SsgPage } from "../server/ssg.js"

export async function transformSearch({
  ssgPages,
  config,
}: {
  ssgPages: SsgPage[]
  config: ResolvedConfig
}) {
  const { include, exclude, trimTitle, targetSelector, hit } =
    config.main.search
  const filterdPages = ssgPages.filter((page) => {
    return picomatch.isMatch(page.path, include, {
      ignore: exclude,
    })
  })

  let tempWords: string[] = []
  let tempPages: {
    path: string
    toc: [number, string][]
    title: string[]
    content: string[]
  }[] = []

  await Promise.all(
    filterdPages.map(async (page) => {
      const spacedHtml = page.html.replace(/<\/(.*)>([^\n\s<])/g, "</$1> $2")
      const parsedHtml = parse(spacedHtml, {
        blockTextElements: { script: false, style: false, pre: false },
      })
      const regTrimTitle = new RegExp(trimTitle)
      const pTitle = parsedHtml.querySelector("title")
      const title = pTitle ? pTitle.rawText.replace(regTrimTitle, "") : ""
      const titleArray = mojigiri(title)

      const targetContent = parsedHtml.querySelector(targetSelector)

      if (!targetContent) {
        tempWords.push(title)
        tempPages.push({
          path: page.path,
          toc: [],
          title: titleArray,
          content: [],
        })
        return
      }

      let contents: { type: string; value: string[] }[] = []

      async function getContent(
        element: NhpHTMLElement & { _rawText?: string }
      ) {
        if (element.id) {
          contents.push({ type: "id", value: [element.id] })
        }
        if (element._rawText) {
          const text = element._rawText
            .replace(/\n/g, "")
            .replace(/\s{2,}/g, " ")
            .trim()
          const words = mojigiri(text)

          if (words.length > 0) {
            contents.push({ type: "words", value: words })
          }
        }
        if (element.childNodes) {
          await Promise.all(
            element.childNodes.map(async (childNode: any) => {
              return await getContent(childNode)
            })
          )
        }
        return
      }

      await getContent(targetContent)

      let toc: [number, string][] = []
      let contentArray: string[][] = []

      let contentCount = 0

      contents.forEach((content) => {
        if (content.type === "id") {
          toc.push([contentCount, content.value[0]])
          return
        } else if (content.type === "words") {
          contentArray.push(content.value)
          contentCount = contentCount + content.value.length
          return
        }
      })

      const body = targetContent.rawText
        .replace(/\n/g, "")
        .replace(/\s{2,}/g, " ")
        .trim()

      tempWords.push(title)
      tempWords.push(body)
      tempPages.push({
        path: page.path,
        toc: toc,
        title: titleArray,
        content: contentArray.flat(),
      })
    })
  )

  let words = mojigiri(tempWords.join(" "))
  words = [...new Set(words)].sort()

  const regHitsArray = [
    hit.number && "[0-9]",
    hit.english && "[a-zA-Z]",
    hit.hiragana && "[ぁ-ん]",
    hit.katakana && "[ァ-ヴ]",
    hit.kanji &&
      "[\u2E80-\u2E99\u2E9B-\u2EF3\u2F00-\u2FD5\u3005\u3007\u3021-\u3029\u3038-\u303B\u3400-\u4DB5\u4E00-\u9FC3\uF900-\uFA2D\uFA30-\uFA6A\uFA70-\uFAD9]",
  ].filter((reg) => reg)
  const regHits = new RegExp(`(${regHitsArray.join("|")})`)
  const hitWords = words.filter(
    (word) =>
      word.length >= hit.minLength && regHits.test(word) && word !== "..."
  )
  const hits = hitWords.map((word) => {
    return words.indexOf(word)
  })

  let pages: {
    path: string
    title: number[]
    toc: [number, string][]
    content: number[]
  }[] = []

  pages = tempPages.map((page) => {
    const toc = page.toc
    const title = page.title.map((word) => {
      return words.indexOf(word)
    })
    const content = page.content.map((word) => {
      return words.indexOf(word)
    })
    return { path: page.path, title, toc, content }
  })

  pages = pages.sort((a, b) => {
    const pathA = a.path.toUpperCase()
    const pathB = b.path.toUpperCase()
    if (pathA < pathB) {
      return -1
    }
    if (pathA > pathB) {
      return 1
    }
    return 0
  })

  return {
    words,
    hits,
    pages,
  }
}
