import { Head } from "minista"

export default function () {
  return (
    <>
      <Head>
        <title>Dynamic Entry</title>
        <link rel="stylesheet" href="/src/assets/entry.css" />
        <link
          rel="stylesheet"
          href="/src/assets/entry2.css"
          data-minista-entry-name="test/custom"
        />
        <script type="module" src="/src/assets/entry.ts" />
      </Head>
      <h1>heading 1</h1>
      <h2>heading 2</h2>
      <p id="js-text"></p>
      <p id="js-text2"></p>
      <script
        type="module"
        src="/src/assets/entry2.ts"
        data-minista-entry-name="test/custom"
      />
    </>
  )
}
