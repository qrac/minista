type MarkdownProps = MarkdownUseContent | MarkdownUseChildren

type MarkdownUseContent = {
  content: string
  children?: string
}
type MarkdownUseChildren = {
  content?: string
  children: string
}

export const Markdown = (props: MarkdownProps) => {
  const content = props.content || props.children
  return <div data-minista-compile-target="markdown">{content}</div>
}
