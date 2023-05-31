import { Head } from "minista"

export default function () {
  return (
    <>
      <Head>
        <title>POST 1</title>
      </Head>
      <h1>POST 1</h1>
      <div data-search>
        <h2 id="jump-1">最初の文章</h2>
        <p>
          CSSプロパティの並びを維持。minify後にCSSプロパティの並びが変わってしまい、納品後のDevTool確認が大変なので解除しておきたい。
        </p>
        <h2 id="jump-2">2番目の文章</h2>
        <p>
          css-minimizer-webpack-plugin に入っている cssnano の設定
          cssDeclarationSorter
          が読み込み速度向上のためにデフォルトで並び替えるようなので、falseにする。
        </p>
      </div>
    </>
  )
}
