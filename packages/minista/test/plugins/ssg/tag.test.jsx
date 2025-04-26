import { describe, it, expect } from "vitest"
import { createElement } from "react"

import {
  getDefaultHeadTags,
  filterHeadTags,
  headTagToStr,
} from "../../../src/plugins/ssg/utils/tag.js"

describe("getDefaultHeadTags", () => {
  it("hasCharset と hasViewport が false、かつ title が指定されている場合は全てのタグを含む", () => {
    const result = getDefaultHeadTags("My Page", false, false)
    expect(result).toHaveLength(3)

    const charsetMeta = result.find(
      (tag) => tag.type === "meta" && tag.props.charSet === "UTF-8"
    )
    const viewportMeta = result.find(
      (tag) => tag.type === "meta" && tag.props.name === "viewport"
    )
    const title = result.find(
      (tag) => tag.type === "title" && tag.props.children === "My Page"
    )
    expect(charsetMeta).toBeTruthy()
    expect(viewportMeta).toBeTruthy()
    expect(title).toBeTruthy()
  })

  it("hasCharset が true の場合は charset タグを省略する", () => {
    const result = getDefaultHeadTags("Page", true, false)
    const charsetMeta = result.find(
      (tag) => tag.type === "meta" && tag.props.charSet
    )
    expect(charsetMeta).toBeUndefined()
    expect(result).toHaveLength(2)
  })

  it("hasViewport が true の場合は viewport タグを省略する", () => {
    const result = getDefaultHeadTags("Page", false, true)
    const viewportMeta = result.find(
      (tag) => tag.type === "meta" && tag.props.name === "viewport"
    )
    expect(viewportMeta).toBeUndefined()
    expect(result).toHaveLength(2)
  })

  it("title が undefined の場合は title タグを省略する", () => {
    const result = getDefaultHeadTags(undefined, false, false)
    const title = result.find((tag) => tag.type === "title")
    expect(title).toBeUndefined()
    expect(result).toHaveLength(2)
  })

  it("全てのタグが既に存在し、title が undefined の場合は空配列を返す", () => {
    const result = getDefaultHeadTags(undefined, true, true)
    expect(result).toEqual([])
  })
})

describe("filterHeadTags", () => {
  it("キーが全てユニークな場合は同じ配列を返す", () => {
    const tags = [<meta key="a" />, <meta key="b" />]
    expect(filterHeadTags(tags)).toEqual(tags)
  })

  it("キーが重複している場合は最後のタグを保持する", () => {
    const tags = [<meta key="a" name="1" />, <meta key="a" name="2" />]
    const result = filterHeadTags(tags)
    expect(result).toHaveLength(1)
    expect(result[0].props.name).toBe("2")
  })

  it("キーなしの要素を扱う", () => {
    const tags = [<meta />, <meta />]
    const result = filterHeadTags(tags)
    expect(result).toHaveLength(2)
  })

  it("キーあり要素とキーなし要素が混在している場合を扱う", () => {
    const tags = [<meta key="x" />, <meta />, <meta key="x" />]
    const result = filterHeadTags(tags)
    expect(result).toHaveLength(2)
  })

  it("最後のキーの挿入順序を維持する", () => {
    const tags = [
      <meta key="a" name="first" />,
      <meta key="b" name="second" />,
      <meta key="a" name="last" />,
    ]
    const result = filterHeadTags(tags)
    expect(result).toHaveLength(2)
    expect(result[0].key).toBe("a")
    expect(result[1].key).toBe("b")
    expect(result[0].props.name).toBe("last")
  })
})

describe("headTagToStr", () => {
  it("meta のようなセルフクロージングタグをレンダリングする", () => {
    const el = <meta charSet="utf-8" />
    const result = headTagToStr(el)
    expect(result).toBe('<meta charset="utf-8" />')
  })

  it("複数属性を持つ link のようなセルフクロージングタグをレンダリングする", () => {
    const el = <link rel="stylesheet" href="/style.css" />
    const result = headTagToStr(el)
    expect(result).toBe('<link rel="stylesheet" href="/style.css" />')
  })

  it("子要素を持つ通常のタグをレンダリングする", () => {
    const el = <title>My Page</title>
    const result = headTagToStr(el)
    expect(result).toBe("<title>My Page</title>")
  })

  it("dangerouslySetInnerHTML を持つタグをレンダリングする", () => {
    const el = (
      <script dangerouslySetInnerHTML={{ __html: 'console.log("Hello")' }} />
    )
    const result = headTagToStr(el)
    expect(result).toBe('<script>console.log("Hello")</script>')
  })

  it("dangerouslySetInnerHTML を子要素より優先する", () => {
    const el = (
      <script
        dangerouslySetInnerHTML={{ __html: "alert(1)" }}
        children="not used"
      />
    )
    const result = headTagToStr(el)
    expect(result).toBe("<script>alert(1)</script>")
  })

  it("文字列または数値でない子要素を無視する", () => {
    const el = <title>{["a", "b"]}</title>
    const result = headTagToStr(el)
    expect(result).toBe("<title></title>")
  })

  it("tag.type が文字列でない場合は空文字を返す", () => {
    const Custom = () => <div />
    const el = <Custom />
    const result = headTagToStr(el)
    expect(result).toBe("")
  })

  it("数値の子要素を持つタグをレンダリングする", () => {
    const el = <title>{2025}</title>
    const result = headTagToStr(el)
    expect(result).toBe("<title>2025</title>")
  })

  it("props がないタグを安全にレンダリングする", () => {
    const el = createElement("title", null, "Untitled")
    const result = headTagToStr(el)
    expect(result).toBe("<title>Untitled</title>")
  })
})
