import { Head } from "minista/head"
import Card from "../../components/Card"

export default function Page() {
  return (
    <>
      <Head>
        <script type="module" src="/src/client.ts" />
      </Head>
      <h1>Nested Shared CSS Modules</h1>
      <p>階層下のページでも、Cardの文字が青色で余白が20pxなら正常です。</p>
      <Card />
      <p>
        <a href="/">Index</a>
      </p>
    </>
  )
}
