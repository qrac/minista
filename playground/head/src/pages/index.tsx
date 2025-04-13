import { Head } from "minista/client"

export default function () {
  return (
    <>
      <Head
        htmlAttributes={{ lang: "en" }}
        bodyAttributes={{ class: "body-class" }}
      >
        <title>Index</title>
        <meta name="description" content="base" key="desc" />
        <meta name="description" content="override" key="desc" />
      </Head>
      <h1>Index</h1>
    </>
  )
}
