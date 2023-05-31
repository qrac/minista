import type { Plugin } from "unified"
import type { Options as RemarkParseOptions } from "remark-parse"
import type { Options as RemarkGfmOptions } from "remark-gfm"
import type { Options as RemarkRehypeOptions } from "remark-rehype"
import type { Options as RehypeHighlightOptions } from "rehype-highlight"
import type { Options as RehypeRawOptions } from "rehype-raw"
import type { Options as RehypeReactOptions } from "rehype-react"
import { createElement, Fragment } from "react"
import { unified } from "unified"
import remarkParse from "remark-parse"
import remarkGfm from "remark-gfm"
import remarkRehype from "remark-rehype"
import rehypeHighlight from "rehype-highlight"
import rehypeRaw from "rehype-raw"
import rehypeReact from "rehype-react"

type MarkdownProps = {
  content?: string
  children?: string
  components?: RehypeReactOptions["components"]
  useRemarkGfm?: boolean
  useRehypeHighlight?: boolean
  remarkPlugins?: Plugin[]
  rehypePlugins?: Plugin[]
  remarkParseOptions?: RemarkParseOptions
  remarkGfmOptions?: RemarkGfmOptions
  remarkRehypeOptions?: RemarkRehypeOptions
  rehypeHighlightOptions?: RehypeHighlightOptions
  rehypeRawOptions?: RehypeRawOptions
  rehypeReactOptions?: RehypeReactOptions
}

export function Markdown({
  content,
  children,
  components = {},
  useRemarkGfm = true,
  useRehypeHighlight = true,
  remarkPlugins,
  rehypePlugins,
  remarkParseOptions = {},
  remarkGfmOptions = {},
  remarkRehypeOptions = { allowDangerousHtml: true },
  rehypeHighlightOptions = {},
  rehypeRawOptions = {},
  rehypeReactOptions = {
    createElement: createElement,
    Fragment: Fragment,
    components: {},
  },
}: MarkdownProps) {
  const _content = content || children || ""
  const _rehypeReactOptions = {
    ...rehypeReactOptions,
    components,
  } as RehypeReactOptions

  const processor = unified()

  processor.use(remarkParse, remarkParseOptions)

  if (useRemarkGfm) {
    processor.use(remarkGfm, remarkGfmOptions)
  }
  if (remarkPlugins?.length) {
    remarkPlugins.map((plugin) => {
      return processor.use(plugin)
    })
  }
  processor.use(remarkRehype, remarkRehypeOptions)

  if (useRehypeHighlight) {
    processor.use(rehypeHighlight, rehypeHighlightOptions)
  }
  if (rehypePlugins?.length) {
    rehypePlugins.map((plugin) => {
      return processor.use(plugin)
    })
  }
  processor.use(rehypeRaw, rehypeRawOptions)
  processor.use(rehypeReact, _rehypeReactOptions)

  return <>{processor.processSync(_content).result}</>
}
