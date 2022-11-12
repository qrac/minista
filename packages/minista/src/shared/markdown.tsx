type MarkdownProps = MarkdownUseContent | MarkdownUseChildren

type MarkdownUseContent = {
  content: string
  children?: string
}
type MarkdownUseChildren = {
  content?: string
  children: string
}

export function Markdown(props: MarkdownProps) {
  const content = props.content || props.children
  return <div data-minista-transform-target="markdown">{content}</div>
}
