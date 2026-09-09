# ADR-0017: Beautifyの整形境界とSSGのimage preload方針

- Status: Accepted
- Date: 2026-09-09

## Context

Beautifyは納品用の整形とimage preload除去を混在させ、generateBundleでJSのcodeだけを書き換えていた。既存のsourcemapとhashが整形結果を表さなくなる。P08で責務と対応範囲を明示する。

## Decision

SSGの`removeImagePreload`は既定でtrueとする。renderer出力をDocumentとして解析し、`link[rel="preload"][as="image"]`を除去してからHead APIを合成する。既存HTML parserを使用し、追加のbundleやReactの再renderは行わない。dev／buildとIslandのSSRで同じ処理を使う。自動生成と生のJSXに書いたlinkは区別できない。Layoutのhead内を含めて除去するため、明示linkの保持はHead APIを契約とする。falseではrenderer出力を保持する。

Beautifyはpreloadを扱わない。旧optionはv5移行期間中deprecatedな公開型を残し、指定時は`MINISTA_BEAUTIFY_OPTION_MOVED` errorでSSGへの移動を案内する。無指定時のSSG既定値変更、body直下以外への対象拡張、devでの変更をmigration noteに記載する。旧optionの実行時互換aliasは設けない。plugin間の設定の書換えや配列順への依存を作らない。

featureは出力選別とfinalize／Emitterの管理を所有し、注入する`OutputFormatter`へ整形を要求する。`JsBeautifyFormatter` adapterだけがjs-beautifyの遅延loaderを呼ぶ。公開formatter option型は従来どおり維持する。Viteの型やhookをCoreへ持ち込まない。

JS chunkはVite adapterの`renderChunk`（post）で整形し、generateBundleではcodeを変更しない。hashとimport参照の確定はbundlerへ委ねる。RolldownのminifyはrenderChunkより後に走るため、対象JSは`output.minify: false`を必須とする。Viteの`build.minify: false`が設定する`dce-only`も整形を上書きすることを実Vite 8.2.2で確認した。違反は`MINISTA_BEAUTIFY_MINIFY_UNSUPPORTED` errorとする。

HTMLとCSSは既存の依存順finalizeで整形する。CSSの命名後に内容を変更するため、`assetFileNames`はhashなしの固定文字列に限定し、hash付きと関数形式は`MINISTA_BEAUTIFY_CSS_HASH_UNSUPPORTED` errorとする。外部pluginの独自hashや後続の任意変換は保証の対象外とする。

js-beautifyは対応mapを生成しない。整形対象のJS／CSSと出力sourcemap（true／inline／hidden）、CSSの隣接mapまたはsourceMappingURLは`MINISTA_BEAUTIFY_SOURCEMAP_UNSUPPORTED` errorとする。対象外の出力とmapは変更しない。診断はstable code／severity／feature／messageを持ち、既存build診断・output transactionに伝播する。

## Validation

実Viteで整形option変更によるJS hash変更、整形内容、固定名CSS、sourcemap／minify／CSS hash／旧optionの拒否を検証する。SSGはfragmentとdocument root、responsive image、lazy image、Head／生JSX link、実Islandとdev／build、Beautify有無を検証する。既存application contractはmanifestとarchiveの最終出力を検証する。

## Rejected alternatives

最終HTMLでReact由来を推測するheuristic、BeautifyからSSGの設定を書き換えるalias、JS整形後のmapを無効なまま残す方法は採用しない。文字列の差分から推測したmapも位置精度を保証できない。CSS／JSを独自に改名して全参照を再実装せず、保証できない組合せを診断にする。

## Reconsideration

位置情報を返すformatterやCSSの命名前の安定した最終変換hookが利用できる場合は、sourcemap／CSS hash制約を再検討する。Rolldownの整形後minifyをページ／chunkごとに制御できる場合はminify制約を見直す。これらはroadmapで追跡する。
