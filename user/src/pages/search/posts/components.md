---
title: コンポーネント
layout: SearchMd
---

任意ですが、ページに使用するコンポーネントを分割して `src/components` に置く方法がおすすめです。v2 以降は CSS ファイルを読み込めるため、隣に置いて管理しやすくなりました。

## Head

`<head>` タグ内のデータを上書きする組み込みコンポーネント。使い方は react-helmet と同様です。

## Comment

HTML コメントを残せる組み込みコンポーネント。本番ビルド時に適応されます。

## Partial Hydration

ページは静的ビルドされますが、使用するコンポーネントは部分的に React App 化することが可能です。詳細は Assets の Partial Hydration を参照ください。
