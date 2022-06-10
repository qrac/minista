import { Head, Comment } from "minista"

const PageComment = () => {
  return (
    <>
      <Head>
        <title>Comment</title>
      </Head>
      <h1>Comment</h1>
      <Comment text="+ Test List" />
      <ul>
        <li>test</li>
        <li>test</li>
        <li>test</li>
      </ul>
      <Comment text="- Test List" />
    </>
  )
}

export default PageComment
