# ADR-0013: SSGをpage formatとrender assetのcomposition rootにする

- Status: Accepted
- Date: 2026-08-28

## Context

`pluginSsg()`と`pluginBundle()`はpage／layoutのsource globを別々に持ち、renderとclientで同じmodule graphを二度構築していました。CSS Modulesを別environmentで再変換すると、HTMLに埋め込まれたclass名とclient CSSのclass名が異なる可能性があります。`pluginMdx()`を登録していない場合もSSGのdefault globへ`.md`／`.mdx`が含まれ、探索対象と有効なpage formatの関係も不明確でした。

## Decision

`pluginSsg()`をpage format、static render、render asset、client output composeの公開composition rootにします。

- `bundle.outName`と`mdx`を`pluginSsg()`のoptionへ統合する
- `pluginBundle()`、`pluginMdx()`、`useExportCss`、Bundle独自の`src`を削除する
- MDXはdefaultで有効にし、`mdx: false`で無効化できる
- `@mdx-js/mdx`の公開`createProcessor()`を使用し、最初の対象moduleまでcompilerを遅延ロードする
- YAML frontmatterの構文登録、解析、MDX export生成は内部MDX機能が所有し、`mdx.frontmatter`でexport名または無効化を指定する。TOML frontmatterはサポートしない
- render environmentで確定したCSS／画像をclient outputへ引き継ぎ、CSS Modulesをclient environmentで再コンパイルしない
- render module graphからrouteごとのsource asset依存を記録し、確定output claimのconsumerへ投影する
- explicit Entry、Island、render assetは同じclient output lifecycleで出力する

Viteのmodule graph、transform hook、render outputはadapterに閉じ、CoreへViteの型を持ち込みません。

## Consequences

- page／layoutの探索範囲は`pluginSsg().src`だけが所有する
- MDXを使わないprojectは拡張子判定以外のcompiler初期化コストを負わない
- client buildでpage module全体を再変換する必要がなくなる
- page import CSSはSSG outputの整合性に必要なため、出力抑止optionを持たない
- v5移行時は`pluginBundle()`と`pluginMdx()`を`pluginSsg()`のnested optionへ移す必要がある

## Rejected alternatives

### client environmentでpage globを再importする

実装は単純ですが、二重変換のcostとCSS Modules hashの不一致をframework invariantとして解消できないため却下します。

### MDX compilerをplugin初期化時にimportする

MDXを使わないprojectもcompilerとunified processorのload costを負うため却下します。

### render asset出力を任意に無効化する

HTMLが参照するclassやasset URLに対応するoutputが欠落し得るため、`useExportCss`相当のoptionは設けません。
