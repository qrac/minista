# ADR-0005: React static rendererを交換可能にする

- Status: Accepted
- Date: 2026-08-12

## Context

現行SSGはReact `renderToString()` を同期実行し、render中の `HeadContext` mutationでhead dataを収集します。React 19のstatic APIはSSG向けにSuspense dataの完了を待てますが、Node.jsでは `prerender()` より `prerenderToNodeStream()` が推奨されています。単純置換するとstream error、doctype、preload、Headの一回render semantics、Preact aliasに差が生じます。

## Decision

Coreはframework非依存のasync `StaticRenderer` portのみを知ります。React adapterは次の順で移行します。

1. current `renderToString()` をadapter化してoutputを固定
2. `prerenderToNodeStream()` implementationとcompatibility fixtureを追加
3. Head / Suspense / preload / Preactのgateを満たした時点でdefaultを切替

Web/edge runtime adapterが必要になった場合は `prerender()` を使用できます。partial prerender / resume APIは初期採用しません。内部名称はrequest-time SSRと区別して `render` / `static renderer` とします。

Vite adapterはReact 19で `ReactStaticRenderer` をdefaultとします。Preact aliasを検出した場合は `ReactRenderToStringRenderer` を選択し、React 18で `react-dom/static` を読み込めない場合も同じcompatibility rendererへ戻します。compatibility adapterをstatic adapterのbarrelから分離することで、Preact経路では `react-dom/static` を読みません。どちらの経路もHeadのside effectを含むpage treeを1回だけrenderし、結果を `HtmlDocument` factoryへ渡します。

## Consequences

- React以外のrendererとstatic APIの変更をCoreから隔離できる
- rendererはasync contractになる
- Head side effectとPreact compatibilityを継続してfixtureで保護する必要がある
- renderer選択はVite adapterに閉じ、CoreはReact versionやaliasを知らない

## Rejected alternatives

### 直ちに `prerender()` へ置換する

Node.jsでの公式推奨と異なり、current Head/output compatibilityの検証なしに変更することになるため却下します。

### ReactをCore dependencyとする

graph、diagnostics、route discoveryとrendering frameworkを不必要に結合するため却下します。

### compatibilityのため永久に `renderToString()` を使う

Suspense dataを待てるSSG向けAPIの利点を得られず、Reactの推奨方向から外れるため却下します。

## Reconsider when

ReactがNode static APIを変更した場合、Preact compatibility layerが同等APIを提供した場合、または二重renderなしではcurrent Head semanticsを維持できないことがfixtureで判明した場合にadapter defaultとHead contractを再検討します。
