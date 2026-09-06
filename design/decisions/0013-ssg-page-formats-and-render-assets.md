# ADR-0013: SSGをpage formatとrender assetのcomposition rootにする

- Status: Accepted
- Date: 2026-08-28
- Amended: 2026-09-06

## Context

`pluginSsg()`と`pluginBundle()`はpage／layoutのsource globを別々に持ち、renderとclientで同じmodule graphを二度構築していました。CSS Modulesを別environmentで再変換すると、HTMLに埋め込まれたclass名とclient CSSのclass名が異なる可能性があります。`pluginMdx()`を登録していない場合もSSGのdefault globへ`.md`／`.mdx`が含まれ、探索対象と有効なpage formatの関係も不明確でした。

## Decision

`pluginSsg()`をpage format、static render、render asset、client output composeの公開composition rootにします。

- `bundle.outName`と`mdx`を`pluginSsg()`のoptionへ統合する
- `pluginBundle()`、`pluginMdx()`、`useExportCss`、Bundle独自の`src`を削除する
- MDXはdefaultで有効にし、`mdx: false`で無効化できる
- `@mdx-js/mdx`の公開`createProcessor()`を使用し、最初の対象moduleまでcompilerを遅延ロードする
- YAML／TOML frontmatterの構文登録、解析、MDX export生成は内部MDX機能が所有し、`mdx.frontmatter`でexport名または無効化を指定する。TOMLの解析には依存0の`smol-toml`を使用する
- render environmentで確定したCSS／画像をclient outputへ引き継ぎ、CSS Modulesをclient environmentで再コンパイルしない
- render module graphからrouteごとのsource asset依存を記録し、確定output claimのconsumerへ投影する
- explicit Entry、Island、render assetは同じclient output lifecycleで出力する

devでは対象Pageのrouteとlayoutを起点として評価済みrender module graphの依存CSSをimport順に収集し、初期HTMLのheadにrender-blockingなstylesheet linkを出力します。全pageをimportするbrowser用asset entryは廃止します。CSS ModulesもViteのdirect CSS配信へ接続し、`?inline`／`?raw`／`?url`のdata importは除外します。CSS変更時のrender invalidationとpage reloadは維持し、変更後のclass名とCSSを再取得します。

Viteのmodule graph、transform hook、render outputはadapterに閉じ、CoreへViteの型を持ち込みません。

## Consequences

- page／layoutの探索範囲は`pluginSsg().src`だけが所有する
- MDXを使わないprojectは拡張子判定以外のcompiler初期化コストを負わない
- client buildでpage module全体を再変換する必要がなくなる
- page import CSSはSSG outputの整合性に必要なため、出力抑止optionを持たない
- v5移行時は`pluginBundle()`と`pluginMdx()`を`pluginSsg()`のnested optionへ移す必要がある

2026-09-06に、v4以前のTOML利用者の移行互換性を保つため、内部frontmatter機能へTOMLを追加しました。従来のparser依存は戻さず、依存0でTOML 1.1を扱う`smol-toml`をbuild時にのみ使用します。生成サイトのclient bundleには含めません。

## Rejected alternatives

### client environmentでpage globを再importする

実装は単純ですが、二重変換のcostとCSS Modules hashの不一致をframework invariantとして解消できないため却下します。

### dev CSSをpage moduleのbrowser importだけで適用する

JSの依存graph取得・実行後にstyleが挿入されるため、通常のページ遷移のたびに未装飾HTMLが描画されます。preloadや画面を隠す処理ではなく、documentのstylesheetとして読み込みを初期描画の前提にします。

### MDX compilerをplugin初期化時にimportする

MDXを使わないprojectもcompilerとunified processorのload costを負うため却下します。

### render asset出力を任意に無効化する

HTMLが参照するclassやasset URLに対応するoutputが欠落し得るため、`useExportCss`相当のoptionは設けません。
