# minista contributor guide

このリポジトリで変更を行う前に、まず [`design/README.md`](design/README.md) を読み、対象領域の設計資料と ADR を確認してください。

## 変更時の原則

- 公開 API (`pluginSsg()`, `pluginMdx()`, `pluginImage()`, `pluginIsland()`, その他の `pluginXXX()`, `defineConfig()`) と内部実装を分けて考える。
- Minista Core に Vite の型や hook を持ち込まない。Vite 固有処理は adapter に閉じ込める。
- feature 間で HTML 文字列、一時ファイル、global state を非公開プロトコルとして使わない。Project Graph、Artifact Store、明示的な phase を使用する。
- 新しい順序依存を作らない。依存は feature descriptor の `requires` / `after` と capability で宣言する。
- 診断は文字列だけで出力せず、安定した code を持つ structured diagnostic として生成する。
- 実装と型を同じ TypeScript ソースに置き、public type と internal type を分離する。
- experimental な Vite API を Core の前提にしない。採用状態と fallback を [`design/vite.md`](design/vite.md) に記録する。
- アーキテクチャを変更した場合は、同じ変更で該当 ADR と設計資料も更新する。

## 検証

段階移行中は変更範囲に応じて、少なくとも次を実行します。

```sh
npm test
npx tsc --noEmit
```

v5 の CLI が実装された後は、fixture に対して次も実行します。

```sh
minista check --json
minista inspect --json
minista build
```

`design/architecture.md` の「Current」は実装済みの事実だけを記載します。未実装、上流待ち、experimental、移行条件は `design/roadmap.md` に置きます。移行期間中だけ、同ファイル内の Current と Target を明示的に分けます。
