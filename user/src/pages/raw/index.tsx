import { Head } from "minista"

import demo from "~/assets/others/demo.html?raw"

const PageRaw = () => {
  return (
    <>
      <Head>
        <title>Raw</title>
      </Head>
      <h1>Raw</h1>
      <div dangerouslySetInnerHTML={{ __html: demo }} />
    </>
  )
}

export default PageRaw
