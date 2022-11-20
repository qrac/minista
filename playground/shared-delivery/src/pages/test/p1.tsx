import { Head } from "minista"

export default function () {
  return (
    <>
      <Head>
        <title>施策1のタイトル</title>
      </Head>
      <h1>Pattern 1</h1>
      <div>
        <p>
          css-minimizer-webpack-plugin に入っている cssnano の設定
          cssDeclarationSorter
          が読み込み速度向上のためにデフォルトで並び替えるようなので、falseにする。
        </p>
      </div>
    </>
  )
}
