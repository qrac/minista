import { Head } from "minista/head"
import { Search } from "minista/assets"

export default function () {
  return (
    <>
      <Head>
        <title>Nest</title>
      </Head>
      <h1>Nest</h1>
      <Search client:load />
    </>
  )
}
