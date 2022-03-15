type CommentProps = {
  text: string
}

export const Comment = ({ text }: CommentProps) => {
  return (
    <div className="minista-comment" hidden>
      {text}
    </div>
  )
}
