import { Head } from "minista/head"

export default function () {
  return (
    <>
      <Head>
        <link rel="stylesheet" href="/src/assets/style.css" data-test="" />
        <link rel="stylesheet" href="/src/assets/dummy.css" />
        <script type="module" src="/src/assets/script.ts" />
      </Head>
      <h1>Nest</h1>
      <div>
        <img src="/src/assets/image.png" alt="icon" width={76} height={76} />
      </div>
    </>
  )
}
