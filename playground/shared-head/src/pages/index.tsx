import { Head } from "minista"

export default function () {
  return (
    <>
      <Head
        htmlAttributes={{ lang: "en" }}
        bodyAttributes={{ class: "custom-body" }}
      >
        <title>HEAD: CUSTOM TITLE</title>
        <meta name="description" content="description" />
      </Head>
      <h1>index</h1>
    </>
  )
}
