# ADR-0024: SSG出力とPWAの連携

- Status: Accepted
- Date: 2026-10-11
- Extends: [ADR-0001](0001-core-feature-vite-adapter.md)、[ADR-0004](0004-plugin-api-compatibility.md)、[ADR-0015](0015-application-lifecycle-and-output-transaction.md)

## Context

vite-plugin-pwa 2.0.0をpluginSsgと直接組み合わせると、Service Workerとprecacheは生成されるが、SSGのHTMLはViteの入力HTMLではないためtransformIndexHtmlによるManifest参照・登録scriptの注入が行われない。render environmentにもPWAのManifestと登録scriptがemitされる。Astroもframework専用integrationを提供している。

## Decision

新規公開APIとしてpluginPwa(options)を追加する。vite-plugin-pwa ^2.0.0はoptional peerとし、repositoryでの検証用にrootのdevDependencyへ追加する。公開entryのimportではロードせず、factoryの呼出しでadapterがdynamic importする。既存factoryの同期契約は変えず、新しいfactoryのみPromise<Plugin[]>を返す。Viteのpluginsにそのまま指定できる。

公開PluginPwaOptionsは隣接した.d.tsで定義し、未導入consumerの型解決がvite-plugin-pwaに依存しないようにする。今回はgenerateSWのproduction buildに範囲を限定し、Manifest、登録方式、workbox、includeAssetsなどの設定を転送する。injectManifest、PWA Assets Generator、dev Service Workerは公開optionへ追加しない。

Vite adapterはupstream pluginをclient environmentへ限定する。upstreamのwebManifestData／registerSWData APIが返すタグを明示的な入力としてdomain featureへ渡す。featureはcompose phaseでHtmlDocumentへタグを追加する。順序はoptionalAfterでComment／Svg／Image／Sprite／Entry／Island／Search／Beautifyの後に宣言し、userのplugins配列順へ依存しない。既存Manifestリンクは保持する。

Service Workerの生成とファイル収集はupstreamのcloseBundleへ委譲する。最終HTMLとpublicアセットが書き出された後にprecacheを生成し、既存の出力reconciliationとtransactionがSW関連ファイルも扱う。既定globはHTML／JS／CSS／JSON／代表的な画像／Webフォントを含む。MPAではトップページへのSPA fallbackは誤ったページを返すため、navigateFallbackはnullを既定とする。利用者がworkboxで上書きできる。

依存未導入時はpluginPwaを呼び出した場合だけMINISTA_PWA_DEPENDENCY_MISSINGを返す。headのない対象HTMLはMINISTA_PWA_HEAD_MISSINGで停止する。第三者プラグインのtransformIndexHtml全体を再実行する契約は追加しない。

## Validation

playground/pwaで直接追加の欠落を再現した後、wrapperによるbuildとChromeのproduction previewを確認した。保存後の通信遮断で未閲覧のコマンド表、reload、ホーム復帰、CSSと画像を表示できる。実Vite integrationではroot／path base、配列順の逆転とBeautify併用、precache revisionが最終HTMLのhashに一致すること、render出力への登録script混入がないことを確認する。

依存解決を拒否するNode loaderで、peerなしの通常entry importとpluginSsg利用、明示的PWA呼出し時の診断を確認した。iOS／Android実機でのホーム画面追加、update prompt UI、relative／CDN base、legacy／外部CLI fallbackは今回の動作確認範囲に含めない。

### クライアント側の自動再読み込み

同日の追加検証で、playground/pwaのクライアントscriptをvirtual:pwa-registerへ変更し、onOfflineReadyで初回保存完了を通知する構成にしました。injectRegisterの既定autoがvirtual importを検出し、登録scriptの二重注入を抑止します。Minista側の実装変更はありません。Chromeでregistration.update()による更新チェック後のHome自動reloadと、新版の未閲覧Aboutをオフラインで表示・reload・Home復帰できることを確認しました。更新の自動検出頻度とiOS／Android実機は未検証です。

## Rejected alternatives

- 直接VitePWAだけを追加する: SSG HTMLへのタグ注入が欠ける。
- HTMLに登録scriptとManifestを手動で固定する: upstreamのbase／登録方式／Manifest名と二重管理になる。
- build後の別commandだけでService Workerを生成する: 生成失敗がMinistaのoutput transactionとmanifest snapshotの外側になる。
