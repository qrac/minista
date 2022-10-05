import { Comment } from "minista"

export default function () {
  return (
    <>
      <Comment text="+ comment" />
      <h1>index</h1>
      <Comment text="- comment" />
      <Comment
        text={`テキスト
        テキストテキストテキストテキストテキスト
        テキストテキストテキストテキストテキストテキスト
        import english text text`}
      />
    </>
  )
}
