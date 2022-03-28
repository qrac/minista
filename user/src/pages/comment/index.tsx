import { Head, Comment } from "minista"

import AppLayout from "../../components/app-layout"

const PageComment = () => {
  return (
    <AppLayout>
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
    </AppLayout>
  )
}

export default PageComment
