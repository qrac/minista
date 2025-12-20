type Item = {
  tabletColumn: number
  title: string
  description: string
}

export type Props = {
  items: Item[]
}

export const initialProps: Props = {
  items: [
    {
      tabletColumn: 6,
      title: "💎 Unified Vite Plugins",
      description:
        "すべての機能をViteプラグイン化しました。ユーザーはViteのコンフィグを用いて自由に組み立てられます。",
    },
    {
      tabletColumn: 6,
      title: "💄 Beautiful Code",
      description:
        "ビルド後のHTMLを読みやすく整形。ウェブ制作業務に必要な納品向けの綺麗なコードを生成します。",
    },
    {
      tabletColumn: 6,
      title: "🏝️ Islands Architecture",
      description:
        "テンプレートから出力されるJavaScriptはゼロですが、部分的にReactでハイドレーションすることも可能です。",
    },
    {
      tabletColumn: 6,
      title: "🖼️ Image Optimisation",
      description:
        "専用のコンポーネントを使うと、画像の最適化とリモート画像のローカルへのダウンロードを同時に行えます。",
    },
    {
      tabletColumn: 4,
      title: "📑 File-based Routing",
      description:
        "ページディレクトリの構造をそのまま反映したシンプルなルーティング。",
    },
    {
      tabletColumn: 4,
      title: "📡 Fetch",
      description: "外部のAPIやCMSから非同期にデータを取得してページ生成。",
    },
    {
      tabletColumn: 4,
      title: "📘 MDX or Markdown",
      description:
        "MDXやMarkdownを書いてページ生成。アセットとしてJSX内で利用も可能。",
    },
    {
      tabletColumn: 4,
      title: "✍️ Dynamic Entry",
      description:
        "アセット用のCSSやJavaScriptをJSX内のルートパスから自動的に取得。",
    },
    {
      tabletColumn: 4,
      title: "🧩 SVG Sprite",
      description:
        "複数のSVGを最適化しつつ、色も変えられるスプライトとして結合。",
    },
    {
      tabletColumn: 4,
      title: "📦 Zip Archive",
      description:
        "納品用に出力するファイルやソースコードをまとめてZipファイル化。",
    },
  ],
}
