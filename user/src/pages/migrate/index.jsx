import { Head, render } from "minista"

import AppLayout from "../../components/app-layout"

const PageAbout = () => {
  return (
    <AppLayout>
      <Head>
        <title>Migrate</title>
      </Head>
      <h1>Migrate</h1>
    </AppLayout>
  )
}

export default render(PageAbout)
