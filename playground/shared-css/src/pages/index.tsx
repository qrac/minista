import { Head } from "minista/head"
import Card from "../components/Card"

export default function Page() {
  return (
    <>
      <Head>
        <script type="module" src="/src/client.ts" />
      </Head>
      <h1>Shared CSS Modules</h1>
      <p>Cardの文字が青色になり、20pxの余白が付けば正常です。</p>
      <Card />
      <p>
        <a href="/nest/">Nest</a>
      </p>
    </>
  )
}
