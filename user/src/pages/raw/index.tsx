import { Head } from "minista"

import AppLayout from "../../components/app-layout"
import demo from "../../assets/others/demo.html?raw"

const PageRaw = () => {
  return (
    <AppLayout>
      <Head>
        <title>Raw</title>
      </Head>
      <h1>Raw</h1>
      <div dangerouslySetInnerHTML={{ __html: demo }} />
    </AppLayout>
  )
}

export default PageRaw
