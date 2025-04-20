import { Head } from "minista/client"

export default function () {
  return (
    <>
      <Head>
        <link rel="icon" href="/image.png" />
      </Head>
      <h1>Index</h1>
      <ul>
        <li>
          <a href="/nest/">Nest</a>
        </li>
      </ul>
      <div>
        <img src="/image2.png" alt="icon" width={76} height={76} />
      </div>
    </>
  )
}
