import { Head } from "minista"

import AppLayout from "../components/app-layout"

const PageNotfound = () => {
  return (
    <AppLayout>
      <Head>
        <meta name="robots" content="noindex" />
      </Head>
      <p>404</p>
    </AppLayout>
  )
}

export default PageNotfound
