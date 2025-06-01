import { Head } from "minista/head"

export default function () {
  return (
    <>
      <Head>
        <link rel="stylesheet" href="/src/assets/ct1/style.css" data-test="" />
        <link rel="stylesheet" href="/src/assets/ct2/style.css" />
        <link rel="stylesheet" href="/src/assets/dummy.css" />
        <script type="module" src="/src/assets/ct3/script.ts" />
      </Head>
      <h1>Index</h1>
      <ul>
        <li>
          <a href="/nest/">Nest</a>
        </li>
      </ul>
      <div>
        <img
          src="/src/assets/ct1/image.png"
          alt="icon"
          width={76}
          height={76}
        />
      </div>
      <div>
        <img
          src="/src/assets/ct2/image.png"
          alt="icon"
          width={76}
          height={76}
        />
      </div>
    </>
  )
}
