import { Head } from "minista"

export default function () {
  return (
    <>
      <Head
        htmlAttributes={{ lang: "en" }}
        bodyAttributes={{ class: "custom-body" }}
      >
        <meta charSet="shift_jis" />
        <meta name="viewport" content="width=500, initial-scale=1" />
        <title>HEAD: CUSTOM TITLE</title>
        <meta name="description" content="description" />
      </Head>
      <h1>index</h1>
      <p>日本語の文字</p>
    </>
  )
}
