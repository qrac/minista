---
title: コンフィグ
layout: SearchMd
---

`minista.config.ts` または `minista.config.js` をプロジェクトルートに作成することでコンフィグを変更できます。エディタの補完を利用する場合は `defineConfig()` 関数でコンフィグを包んでください。コンフィグの初期値・型・詳細の参照先は以下の通りです。

## Resolve Alias

エイリアスパスを追加するには 2 つの設定が必要です。まず、`tsconfig.json` または `jsconfig.json` に設定 `compilerOptions.paths` を追加してください。以下の例ではパスの `~` をプロジェクトルートの `src` にマッピングしています。

次に、`minista.config.ts` または `minista.config.js` に `resolve.alias` を設定します。

これで `~` をプロジェクトルートの `src` として使えるようになりました。

## TypeScript

TypeScript は npm install して `tsconfig.json` を設定することで使えます。`compilerOptions.types` に `minista/client` を加えることで、SVG の React Component 化・インポート・ファイルの文字列インポート `*?raw`・Partial Hydration `*?ph` の定義を反映できます。

## CSS Modules

CSS Modules はデフォルトで使える状態です。スコープされた CSS と HTML class が出力されます。

## Sass

dart-sass は npm install するだけで使えます。

## PostCSS

PostCSS はプロジェクトルートに `postcss.config.js` を作成することで使えます。例えば、Autoprefixer を使う場合は npm install して以下のように設定。
