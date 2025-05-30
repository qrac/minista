import { Head } from "minista/head"
import { Search } from "minista/assets"

export default function () {
  return (
    <>
      <Head>
        <title>Index</title>
      </Head>
      <h1>Index</h1>
      <ul>
        <li>
          <a href="/nest/">Nest</a>
        </li>
      </ul>
      <Search client:load />
    </>
  )
}
