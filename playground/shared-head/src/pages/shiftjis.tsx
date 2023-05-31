import { Head } from "minista"

export default function () {
  return (
    <>
      <Head bodyAttributes={{ class: "custom-body" }}>
        <meta charSet="shift_jis" />
        <meta name="viewport" content="width=500, initial-scale=1" />
        <title>Shift-JIS Page</title>
        <meta name="description" content="description" />
      </Head>
      <h1>Shift-JIS Page</h1>
      <p>日本語の文字</p>
    </>
  )
}
