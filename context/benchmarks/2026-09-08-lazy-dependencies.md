# P05: 重い依存の遅延ロード測定

測定日: 2026-09-08。実装後のfresh process測定。

## 条件

- macOS arm64、Node.js 26.2.0、repository lockfileの依存（Vite 8.2.2）。同一マシンで各modeを順番に1回実行。
- `node scripts/benchmark-lazy-dependencies.js <mode>`。modeは`import`／`ssg`／`image`／`svg`／`sprite`／`archive`／`beautify`。
- 各回は新規Node process。OSのfilesystem cacheはclearしていない。時刻は`performance.now()`、単位はms。module resolve hookの記録I/Oを含む。
- importはpackage entry評価まで。startupは全公開plugin factoryの同期生成確認、temporary fixture準備、対象adapter準備までの累積。SSGだけはmiddleware modeのVite server作成・closeまでを含む。HTTP requestによるpage renderは測定していない。
- 初回は独立した2処理を同時に実行して両方が完了するまで。再利用は同一processの追加1処理。Image／Svg／Sprite／Archiveは新しいadapter instanceを作り、入力cacheのhitだけで速くなる比較を避ける。
- 入力はviewBoxが10×10の単一path SVG。Imageはmetadata取得とPNG変換、Svgは属性取得・最適化、Spriteは単一fileのsymbol生成、Archiveは単一SVGのZIP化。Beautifyは短いHTML文字列。
- loaderはNode.jsに`registerHooks`がある場合は同期hookを使用し、ない場合は`register`を使用する。後者は別threadのhookになるため数値を直接比較しない。

## 結果

| mode | cold import | startup累積 | 初回2処理 | 再利用1処理 | 対象libraryの読み込み |
| --- | ---: | ---: | ---: | ---: | --- |
| import | 632.6 | 669.5 | — | — | なし |
| ssg | 706.7 | 885.2 | — | — | なし |
| image | 654.2 | 698.2 | 176.5 | 11.1 | sharp |
| svg | 688.8 | 731.3 | 423.0 | 4.2 | svgo |
| sprite | 671.1 | 715.8 | 452.6 | 9.9 | svgo |
| archive | 712.2 | 757.5 | 196.6 | 15.6 | archiver |
| beautify | 703.4 | 746.2 | 43.3 | 4.8 | js-beautify |

## 解釈と検証範囲

package importとSSG起動ではSharp／SVGO／archiver／js-beautifyのresolveが一度も発生せず、評価も起きない。各処理は必要なlibraryだけを読み込む。対象外のformatter入力もjs-beautifyを読み込まない。同時処理の結果が一致することを確認し、module初期化Promiseはprocess内で共有する。source cacheやpipelineをmodule globalへ移していない。

`lazy-dependencies.test.js`は上記7経路に加え、5種類の初期化失敗をfresh processで注入する。Imageは`MINISTA_IMAGE_METADATA_FAILED`、Svg／Spriteは各`OPTIMIZE_FAILED`、Archiveは`MINISTA_ARCHIVE_FAILED`、BeautifyはLifecycleRunnerの`MINISTA_PHASE_FAILED`を検証する。

単発測定のため性能保証・改善率の主張には使わない。変更前の同条件baseline、実サイトのHTTP初回応答、MDX処理、memory・インストール容量は測定していない。遅延ロードは初期化コストを初回利用へ移すもので、依存のインストール容量は変わらない。node-html-parser、mojigiri、Viteなど今回対象外の依存をすべて遅延化したわけではない。
