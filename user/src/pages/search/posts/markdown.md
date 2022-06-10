---
title: Markdown
layout: SearchMd
---

`src/pages` 配下は Markdown `.md` や MDX `.mdx` でファイルベースルーティングに対応したページファイルを作成することもできます。デフォルトで remark-gfm と rehype-highlight が適応されます。

Markdown `.md` と MDX `.mdx` ファイルは React Component としてページ内でも使用できます。

## Plugins

Config の `markdown` にて remark と rehype のプラグインを登録できます。

## frontmatter

フロントマターに記述したデータは root や MDX ページで props として使用できます。また、`draft` のみ特別で `true` にすると下書きとなり本番ビルドから除外されます。

## components

Root の `getStaticData` で `components` を渡すと HTML を React Component に差し替えられます。
