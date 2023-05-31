import { Head } from "minista"

export const metadata = {
  draft: false,
}

export default function () {
  return (
    <>
      <Head>
        <title>施策4のタイトル</title>
      </Head>
      <h1>Pattern 4</h1>
      <div>
        <p>
          案件でよく使うのでデフォルトで実装。納品後、開発側の環境に依存せず少量のDOMで色変更できるアイコンが呼び出せる。
        </p>
      </div>
    </>
  )
}
