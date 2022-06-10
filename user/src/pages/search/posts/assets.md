---
title: アセット
layout: SearchMd
---

minista はテンプレートに使用している React の JavaScript を完全に切り捨てるため、実際の web サイトで実行する JavaScript は Config からのエントリー制にしています。

CSS のエントリーも可能ですが、v2 以降は後述する Bundle 機能の方が手軽です。

## Bundle

JSX のテンプレート Pages・Components・Root で import した CSS ファイルは自動的に `bundle.css` として結合され全体に適応されます。

## Partial Hydration

Components を部分的に React App として動くアセットに変換できます。参照パスの末尾に `?ph` を付与することで Partial Hydration の対象となります。

定義したコンポーネントでは React の Hook などを自由に使えます。ただし、コンポーネントは隔離されているためページから props を渡せません。また、named export には対応していません。

## Raw

アセットを文字列としてインポートする場合は、参照ファイルの末尾に `?raw` を付与します。

## SVGR

SVG ファイルは React Component としてインポートできます。

## Sprite Icons

`src/assets/icons` に SVG アイコンを入れると自動的にスプライト化され ID 付きのパスで簡単に使えます。

## Remote Download

Config で `assets.download.useRemote` を `true` にするとテンプレートに流し込んだ CMS などのリモート画像を自動的にダウンロードしてパスを置換します。
