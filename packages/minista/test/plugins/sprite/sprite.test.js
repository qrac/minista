import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { describe, it, expect, beforeEach, afterEach } from "vitest"

import { generateSprite } from "../../../src/plugins/sprite/utils/sprite.js"

/** @type {string} */
let targetDir

beforeEach(async () => {
  targetDir = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), "minista-sprite-test-"),
  )
})

afterEach(async () => {
  await fs.promises.rm(targetDir, { recursive: true, force: true })
})

/**
 * @param {string} fileName
 * @param {string} content
 */
async function writeSvg(fileName, content) {
  await fs.promises.writeFile(path.join(targetDir, fileName), content, "utf8")
}

// preset-default 内の convertShapeToPath を無効化し、<rect> が <path> に
// 変換されないようにする。ここでは正規化の結果ではなく「複数の兄弟要素が
// 生き残るか」「text が保持されるか」を確認したいため。
const noShapeToPathConfig = {
  plugins: [
    {
      name: "preset-default",
      params: { overrides: { convertShapeToPath: false } },
    },
  ],
}

describe("generateSprite", () => {
  it("直下に単一要素だけのSVGを処理できる", async () => {
    await writeSvg(
      "square.svg",
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24"/></svg>`,
    )
    const result = await generateSprite(targetDir, noShapeToPathConfig)
    expect(result).toContain('<symbol id="square" viewBox="0 0 24 24">')
    expect(result).toContain("<rect")
  })

  it("直下にpathとrectが並んでいてもクラッシュせず両方残る", async () => {
    await writeSvg(
      "multi.svg",
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M4 4h8v8H4Z"/><rect x="14" y="14" width="8" height="8"/></svg>`,
    )
    const result = await generateSprite(targetDir, noShapeToPathConfig)
    expect(result).toContain('<symbol id="multi" viewBox="0 0 24 24">')
    expect(result).toContain("<path")
    expect(result).toContain("<rect")
  })

  it("先頭以外にtextがあってもSVGOの解析エラーにならず全要素が残る", async () => {
    await writeSvg(
      "with-text.svg",
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M4 4h8v8H4Z"/><rect x="14" y="14" width="8" height="8"/><text x="2" y="22" font-size="6">Hi</text></svg>`,
    )
    await expect(
      generateSprite(targetDir, noShapeToPathConfig),
    ).resolves.not.toThrow()
    const result = await generateSprite(targetDir, noShapeToPathConfig)
    expect(result).toContain('<symbol id="with-text" viewBox="0 0 24 24">')
    expect(result).toContain("<path")
    expect(result).toContain("<rect")
    expect(result).toContain("<text")
    expect(result).toContain("Hi")
  })

  it("<symbol>形式のスプライトでも、先頭以外のtextでクラッシュしない", async () => {
    await writeSvg(
      "presprited.svg",
      [
        `<svg xmlns="http://www.w3.org/2000/svg">`,
        `<symbol id="a" viewBox="0 0 24 24">`,
        `<path d="M4 4h8v8H4Z"/>`,
        `<text x="2" y="22" font-size="6">Hi</text>`,
        `</symbol>`,
        `</svg>`,
      ].join(""),
    )
    const result = await generateSprite(targetDir)
    expect(result).toContain('<symbol id="a" viewBox="0 0 24 24">')
    expect(result).toContain("<text")
  })

  it("先頭以外のtitleでもクラッシュしない(アクセシビリティ用title/descの典型パターン)", async () => {
    await writeSvg(
      "with-title.svg",
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M4 4h8v8H4Z"/><title>Icon name</title></svg>`,
    )
    await expect(generateSprite(targetDir)).resolves.not.toThrow()
    const result = await generateSprite(targetDir)
    expect(result).toContain('<symbol id="with-title" viewBox="0 0 24 24">')
    expect(result).toContain("<title")
    expect(result).toContain("Icon name")
  })

  it("改行・インデント付きの実ファイルに近い形式でもクラッシュしない", async () => {
    await writeSvg(
      "pretty.svg",
      [
        `<?xml version="1.0" encoding="utf-8"?>`,
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">`,
        `  <path d="M4 4h8v8H4Z" fill="#333"/>`,
        `  <rect x="14" y="14" width="8" height="8" fill="#666"/>`,
        `  <text x="2" y="22" font-size="6">Hi</text>`,
        `</svg>`,
        ``,
      ].join("\n"),
    )
    await expect(generateSprite(targetDir)).resolves.not.toThrow()
    const result = await generateSprite(targetDir)
    expect(result).toContain('<symbol id="pretty" viewBox="0 0 24 24">')
    expect(result).toContain("<text")
    expect(result).toContain("Hi")
  })

  it("<g>でネストしたtextが後続にあってもクラッシュしない", async () => {
    await writeSvg(
      "grouped-text.svg",
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M4 4h8v8H4Z"/><g><text x="2" y="22" font-size="6">Hi</text></g></svg>`,
    )
    await expect(generateSprite(targetDir)).resolves.not.toThrow()
    const result = await generateSprite(targetDir)
    expect(result).toContain('<symbol id="grouped-text" viewBox="0 0 24 24">')
    expect(result).toContain("<text")
    expect(result).toContain("Hi")
  })

  it("1ファイルに複数のsymbolがあっても、それぞれ独立して処理できる(中身が混ざらない)", async () => {
    await writeSvg(
      "multi-symbol.svg",
      [
        `<svg xmlns="http://www.w3.org/2000/svg">`,
        `<symbol id="a" viewBox="0 0 24 24">`,
        `<path d="M4 4h8v8H4Z"/>`,
        `<text x="2" y="22" font-size="6">A</text>`,
        `</symbol>`,
        `<symbol id="b" viewBox="0 0 32 32">`,
        `<rect width="32" height="32"/>`,
        `<text x="2" y="30" font-size="6">B</text>`,
        `</symbol>`,
        `</svg>`,
      ].join(""),
    )
    const result = await generateSprite(targetDir)

    expect(result).toContain('<symbol id="a" viewBox="0 0 24 24">')
    expect(result).toContain('<symbol id="b" viewBox="0 0 32 32">')

    const symbolA = result.match(/<symbol id="a"[^]*?<\/symbol>/)?.[0] ?? ""
    const symbolB = result.match(/<symbol id="b"[^]*?<\/symbol>/)?.[0] ?? ""

    expect(symbolA).toContain(">A<")
    expect(symbolA).not.toContain(">B<")
    expect(symbolB).toContain(">B<")
    expect(symbolB).not.toContain(">A<")
  })

  it("最適化後に中身が空になるsymbolはクラッシュせずスキップされる", async () => {
    await writeSvg(
      "empty-after-optimize.svg",
      [
        `<svg xmlns="http://www.w3.org/2000/svg">`,
        `<symbol id="empty" viewBox="0 0 24 24">`,
        `<g></g>`,
        `</symbol>`,
        `<symbol id="kept" viewBox="0 0 24 24">`,
        `<path d="M4 4h8v8H4Z"/>`,
        `</symbol>`,
        `</svg>`,
      ].join(""),
    )
    await expect(generateSprite(targetDir)).resolves.not.toThrow()
    const result = await generateSprite(targetDir)
    expect(result).not.toContain('id="empty"')
    expect(result).toContain('<symbol id="kept" viewBox="0 0 24 24">')
  })

  it("ラップ用に挿入したviewBoxが抽出結果に漏れ出さない", async () => {
    await writeSvg(
      "viewbox-leak.svg",
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M4 4h8v8H4Z"/><text x="2" y="22" font-size="6">Hi</text></svg>`,
    )
    const result = await generateSprite(targetDir)
    const symbol =
      result.match(/<symbol id="viewbox-leak"[^]*?<\/symbol>/)?.[0] ?? ""
    // symbol タグ自身の viewBox 属性1回分だけが含まれ、中身側には出てこないこと
    expect(symbol.match(/viewBox="0 0 24 24"/g)?.length).toBe(1)
  })
})
