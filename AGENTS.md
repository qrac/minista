# minista contributor guide

このリポジトリで変更を行う前に、まず [`design/README.md`](design/README.md) を読み、対象領域の設計資料とADRを確認してください。

## 変更時の原則

- 公開API (`pluginSsg()`, `pluginImage()`, `pluginIsland()`, その他の `pluginXXX()`, `defineConfig()`) と内部実装を分けて考える。
- Minista CoreにViteの型やhookを持ち込まない。Vite固有処理はadapterに閉じ込める。
- feature間でHTML文字列、一時ファイル、global stateを非公開プロトコルとして使わない。Project Graph、Artifact Store、明示的なphaseを使用する。
- 新しい順序依存を作らない。依存はfeature descriptorの `requires` / `after` とcapabilityで宣言する。
- 診断は文字列だけで出力せず、安定したcodeを持つstructured diagnosticとして生成する。
- ランタイム実装はJavaScript + JSDocとし、必要なpublic typeは隣接する `.d.ts` に置く。public typeとinternal typeは分離する。
- 通常の開発、CLI実行、testに事前buildを要求しない。package entryとtestは `src/` を直接参照する。
- experimentalなVite APIをCoreの前提にしない。採用状態とfallbackを [`design/vite.md`](design/vite.md) に記録する。
- アーキテクチャを変更した場合は、同じ変更で該当ADRと設計資料も更新する。

## 文書表記

- 日本語と英数字の間に一律のスペースを入れない。
- インラインコードやGitHub Markdownの強調を日本語文章へ接続するときは、可読性のためにスペースを入れてもよい。
- コードブロック、識別子、URL、コマンドの内容は表記統一の対象にしない。

## 検証

段階移行中は変更範囲に応じて、少なくとも次を実行します。

```sh
npm test
npx tsc --noEmit
```

v5のCLIが実装された後は、fixtureに対して次も実行します。

```sh
minista check --json
minista inspect --json
minista build
```

`design/architecture.md` の「Current」は実装済みの事実だけを記載します。未実装、上流待ち、experimental、移行条件は `design/roadmap.md` に置きます。移行期間中だけ、同ファイル内のCurrentとTargetを明示的に分けます。
