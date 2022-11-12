type CommentProps = CommentUseContent | CommentUseChildren

type CommentUseContent = {
  text: string
  children?: string
}
type CommentUseChildren = {
  text?: string
  children: string
}

export function Comment(props: CommentProps) {
  const text = props.text || props.children
  return <div data-minista-transform-target="comment">{text}</div>
}
