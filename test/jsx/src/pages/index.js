import { Helmet } from "react-helmet"
import { render, Comment } from "minista"

import AppLayout from "../components/app-layout"

const PageHome = () => {
  return (
    <AppLayout>
      <Helmet>
        <title>Home</title>
        <link rel="icon" href="/favicon.png" />
      </Helmet>
      <Comment text="Comment Test" />
      <h1>Hello</h1>
    </AppLayout>
  )
}

export default render(<PageHome />)
