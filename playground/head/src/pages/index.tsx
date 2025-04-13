import { Head } from "minista/client"

export default function () {
  return (
    <>
      <Head
        htmlAttributes={{ class: "html-class" }}
        bodyAttributes={{ class: "body-class" }}
      >
        <title>Index</title>
        <meta name="description" content="This is the index page." />
      </Head>
      <h1>Index</h1>
    </>
  )
}
