import { describe, it, expect } from "vitest"
import React from "react"

import {
  checkCharsetTag,
  checkViewportTag,
  getDefaultHeadTags,
  filterHeadTags,
  transformHeadTag,
} from "../../src/head/tag.js"

describe("checkCharsetTag", () => {
  it("returns true if <meta charSet> is present", () => {
    const tags = [<meta charSet="utf-8" key="charset" />]
    expect(checkCharsetTag(tags)).toBe(true)
  })

  it("returns false if <meta> has no charSet", () => {
    const tags = [<meta name="viewport" content="width=device-width" />]
    expect(checkCharsetTag(tags)).toBe(false)
  })

  it("returns false if no tags", () => {
    expect(checkCharsetTag([])).toBe(false)
  })

  it("returns false for other tags", () => {
    const tags = [
      <title>Test</title>,
      <link rel="stylesheet" href="/style.css" />,
    ]
    expect(checkCharsetTag(tags)).toBe(false)
  })
})

describe("checkViewportTag", () => {
  it("returns true if <meta name='viewport'> is present", () => {
    const tags = [
      <meta name="viewport" content="width=device-width" key="viewport" />,
    ]
    expect(checkViewportTag(tags)).toBe(true)
  })

  it("returns false if <meta> has different name", () => {
    const tags = [<meta name="description" content="sample" key="desc" />]
    expect(checkViewportTag(tags)).toBe(false)
  })

  it("returns false if no tags", () => {
    expect(checkViewportTag([])).toBe(false)
  })

  it("returns false for other tag types", () => {
    const tags = [<title>Test</title>]
    expect(checkViewportTag(tags)).toBe(false)
  })
})

describe("getDefaultHeadTags", () => {
  it("includes all tags when hasCharset and hasViewport are false and title is given", () => {
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

  it("omits charset tag if hasCharset is true", () => {
    const result = getDefaultHeadTags("Page", true, false)
    const charsetMeta = result.find(
      (tag) => tag.type === "meta" && tag.props.charSet
    )
    expect(charsetMeta).toBeUndefined()
    expect(result).toHaveLength(2)
  })

  it("omits viewport tag if hasViewport is true", () => {
    const result = getDefaultHeadTags("Page", false, true)
    const viewportMeta = result.find(
      (tag) => tag.type === "meta" && tag.props.name === "viewport"
    )
    expect(viewportMeta).toBeUndefined()
    expect(result).toHaveLength(2)
  })

  it("omits title tag if title is undefined", () => {
    const result = getDefaultHeadTags(undefined, false, false)
    const title = result.find((tag) => tag.type === "title")
    expect(title).toBeUndefined()
    expect(result).toHaveLength(2)
  })

  it("returns empty array if all tags are already present and title is undefined", () => {
    const result = getDefaultHeadTags(undefined, true, true)
    expect(result).toEqual([])
  })
})

describe("filterHeadTags", () => {
  it("returns same array when all keys are unique", () => {
    const tags = [<meta key="a" />, <meta key="b" />]
    expect(filterHeadTags(tags)).toEqual(tags)
  })

  it("keeps last tag when keys are duplicated", () => {
    const tags = [<meta key="a" name="1" />, <meta key="a" name="2" />]
    const result = filterHeadTags(tags)
    expect(result).toHaveLength(1)
    expect(result[0].props.name).toBe("2")
  })

  it("handles elements without keys", () => {
    const tags = [<meta />, <meta />]
    const result = filterHeadTags(tags)
    expect(result).toHaveLength(2)
  })

  it("handles mixed keyed and unkeyed elements", () => {
    const tags = [<meta key="x" />, <meta />, <meta key="x" />]
    const result = filterHeadTags(tags)
    expect(result).toHaveLength(2)
  })

  it("preserves insertion order of last keys", () => {
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

describe("transformHeadTag", () => {
  it("renders self-closing tag like meta", () => {
    const el = <meta charSet="utf-8" />
    const result = transformHeadTag(el)
    expect(result).toBe('<meta charset="utf-8" />')
  })

  it("renders self-closing tag like link with multiple attributes", () => {
    const el = <link rel="stylesheet" href="/style.css" />
    const result = transformHeadTag(el)
    expect(result).toBe('<link rel="stylesheet" href="/style.css" />')
  })

  it("renders normal tag with children", () => {
    const el = <title>My Page</title>
    const result = transformHeadTag(el)
    expect(result).toBe("<title>My Page</title>")
  })

  it("renders tag with dangerouslySetInnerHTML", () => {
    const el = (
      <script dangerouslySetInnerHTML={{ __html: 'console.log("Hello")' }} />
    )
    const result = transformHeadTag(el)
    expect(result).toBe('<script>console.log("Hello")</script>')
  })

  it("prioritizes dangerouslySetInnerHTML over children", () => {
    const el = (
      <script
        dangerouslySetInnerHTML={{ __html: "alert(1)" }}
        children="not used"
      />
    )
    const result = transformHeadTag(el)
    expect(result).toBe("<script>alert(1)</script>")
  })

  it("ignores children if not string or number", () => {
    const el = <title>{["a", "b"]}</title>
    const result = transformHeadTag(el)
    expect(result).toBe("<title></title>")
  })

  it("returns empty string if tag.type is not a string", () => {
    const Custom = () => <div />
    const el = <Custom />
    const result = transformHeadTag(el)
    expect(result).toBe("")
  })

  it("renders tag with numeric children", () => {
    const el = <title>{2025}</title>
    const result = transformHeadTag(el)
    expect(result).toBe("<title>2025</title>")
  })

  it("renders tag with no props safely", () => {
    const el = React.createElement("title", null, "Untitled")
    const result = transformHeadTag(el)
    expect(result).toBe("<title>Untitled</title>")
  })
})
