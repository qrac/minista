# ADR-0005: React static renderer を交換可能にする

- Status: Accepted
- Date: 2026-08-12

## Context

現行 SSG は React `renderToString()` を同期実行し、render 中の `HeadContext` mutation で head data を収集します。React 19 の static API は SSG 向けに Suspense data の完了を待てますが、Node.js では `prerender()` より `prerenderToNodeStream()` が推奨されています。単純置換すると stream error、doctype、preload、Head の一回 render semantics、Preact alias に差が生じます。

## Decision

Core は framework 非依存の async `StaticRenderer` port のみを知ります。React adapter は次の順で移行します。

1. current `renderToString()` を adapter 化して output を固定
2. `prerenderToNodeStream()` implementation と compatibility fixture を追加
3. Head / Suspense / preload / Preact の gate を満たした時点で default を切替

Web/edge runtime adapter が必要になった場合は `prerender()` を使用できます。partial prerender / resume API は初期採用しません。内部名称は request-time SSR と区別して `render` / `static renderer` とします。

## Consequences

- React 以外の renderer と static API の変更を Core から隔離できる
- renderer は async contract になる
- current Head side effect を安全に移行する設計と test が必要
- React static API を v5 最初の Core 実装の blocker にしない

## Rejected alternatives

### 直ちに `prerender()` へ置換する

Node.js での公式推奨と異なり、current Head/output compatibility の検証なしに変更することになるため却下します。

### React を Core dependency とする

graph、diagnostics、route discovery と rendering framework を不必要に結合するため却下します。

### compatibility のため永久に `renderToString()` を使う

Suspense data を待てる SSG 向け API の利点を得られず、React の推奨方向から外れるため却下します。

## Reconsider when

React が Node static API を変更した場合、Preact compatibility layer が同等 API を提供した場合、または二重 render なしでは current Head semantics を維持できないことが fixture で判明した場合に adapter default と Head contract を再検討します。
