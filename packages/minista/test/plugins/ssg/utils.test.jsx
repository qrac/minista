import { describe, it, expect } from "vitest"
import React from "react"

import {
  headAttrsToStr,
  checkCharsetTag,
  checkViewportTag,
  getDefaultHeadTags,
  filterHeadTags,
  headTagToStr,
} from "../../../src/plugins/ssg/utils.js"

describe("headAttrsToStr (excluding undefined)", () => {
  it("空のオブジェクトの場合は空文字を返す", () => {
    expect(headAttrsToStr({})).toBe("")
  })

  it("単一の属性を変換する", () => {
    expect(headAttrsToStr({ lang: "ja" })).toBe('lang="ja"')
  })

  it("複数の属性を変換する", () => {
    const result = headAttrsToStr({ lang: "en", dir: "ltr" })
    expect(['lang="en" dir="ltr"', 'dir="ltr" lang="en"']).toContain(result)
  })

  it("数値を処理できる", () => {
    expect(headAttrsToStr({ tabIndex: 0 })).toBe('tabIndex="0"')
  })

  it("boolean の true と false を扱う", () => {
    expect(headAttrsToStr({ hidden: true, inert: false })).toBe(
      'hidden="true" inert="false"'
    )
  })

  it("null を扱う", () => {
    // @ts-ignore
    expect(headAttrsToStr({ test: null })).toBe('test="null"')
  })

  it("undefined の属性を除外する", () => {
    // @ts-ignore
    const result = headAttrsToStr({ lang: undefined, theme: "dark" })
    expect(result).toBe('theme="dark"')
  })

  it("混合された値を扱う", () => {
    const attrs = {
      lang: "en",
      theme: undefined,
      count: 5,
      hidden: false,
      title: null,
    }
    const result = headAttrsToStr(attrs)
    expect(result).toBe('lang="en" count="5" hidden="false" title="null"')
  })
})

describe("checkCharsetTag", () => {
  it("<meta charSet が存在する場合は true を返す", () => {
    const tags = [<meta charSet="utf-8" key="charset" />]
    expect(checkCharsetTag(tags)).toBe(true)
  })

  it("<meta に charSet がない場合は false を返す", () => {
    const tags = [<meta name="viewport" content="width=device-width" />]
    expect(checkCharsetTag(tags)).toBe(false)
  })

  it("タグがない場合は false を返す", () => {
    expect(checkCharsetTag([])).toBe(false)
  })

  it("他のタグの場合は false を返す", () => {
    const tags = [
      <title>Test</title>,
      <link rel="stylesheet" href="/style.css" />,
    ]
    expect(checkCharsetTag(tags)).toBe(false)
  })
})

describe("checkViewportTag", () => {
  it("<meta name='viewport'> が存在する場合は true を返す", () => {
    const tags = [
      <meta name="viewport" content="width=device-width" key="viewport" />,
    ]
    expect(checkViewportTag(tags)).toBe(true)
  })

  it("<meta の name が異なる場合は false を返す", () => {
    const tags = [<meta name="description" content="sample" key="desc" />]
    expect(checkViewportTag(tags)).toBe(false)
  })

  it("タグがない場合は false を返す", () => {
    expect(checkViewportTag([])).toBe(false)
  })

  it("他のタグタイプの場合は false を返す", () => {
    const tags = [<title>Test</title>]
    expect(checkViewportTag(tags)).toBe(false)
  })
})

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
    const el = React.createElement("title", null, "Untitled")
    const result = headTagToStr(el)
    expect(result).toBe("<title>Untitled</title>")
  })
})
