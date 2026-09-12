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

## 文書の言語

- GitHubやnpmなど外部の利用者に向けたREADMEは英語を基本とする。
- `AGENTS.md`、`design/` 配下の設計資料、ADR、計画、レビューなど、開発・保守のための内部文書は日本語を基本とする。
- `docs/` は英語をデフォルト言語として公開し、日本語版も提供する。
- `docs/` の新規作成・大幅な改稿では、まず日本語版を作成して内容を確認し、確定した日本語版を基準に英語版を作成する。
- 英語版は直訳ではなく、技術的な意味、コード例、用語、リンク構造を日本語版と一致させたうえで、英語として自然な表現にする。
- 日本語版と英語版の内容に差異が生じた場合は、原則として日本語版で内容を確定してから英語版へ反映する。

## 文書表記

- 日本語と英数字の間に一律のスペースを入れない。
- インラインコードやGitHub Markdownの強調を日本語文章へ接続するときは、可読性のためにスペースを入れてもよい。
- コードブロック、識別子、URL、コマンドの内容は表記統一の対象にしない。

## 検証

段階移行中は変更範囲に応じて、少なくとも次を実行します。

```sh
npm run test:ci
```

Vite／React／Node.jsの対応範囲へ影響する変更では、必要なcompatibility scriptもローカルで実行し、GitHub Actionsの`Compatibility CI`を対象suiteまたは`all`で手動実行します。

v5のCLIが実装された後は、fixtureに対して次も実行します。

```sh
minista check --json
minista inspect --json
minista build
```

`design/architecture.md` の「Current」は実装済みの事実だけを記載します。未実装、上流待ち、experimental、移行条件は `design/roadmap.md` に置きます。移行期間中だけ、同ファイル内のCurrentとTargetを明示的に分けます。

## Command execution

- テスト、ビルド、型チェックなど時間のかかるコマンドは、1秒程度の短い間隔で繰り返し状態確認しない。過去の実行時間や処理内容を踏まえて十分に待ってから確認する。
