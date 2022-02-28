import { Head, render } from "minista"

import AppLayout from "../../components/app-layout"

const PageAbout = () => {
  return (
    <AppLayout>
      <Head>
        <title>About</title>
      </Head>
      <h1>About</h1>
    </AppLayout>
  )
}

export default render(PageAbout)
