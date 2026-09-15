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

検証は網羅性よりも、変更内容に対して必要十分であることを優先します。

通常の変更では、変更箇所に直接関係する最小限のテスト、型チェック、または動作確認だけを実行してください。すべてのテストやビルドを一律に実行する必要はありません。

### 通常実行する検証

日常的な検証は、高速で局所的なものを優先します。

- 変更した純粋関数やユーティリティに対応するunit test
- 必要な範囲の型チェック
- 変更した機能に対応するplaygroundでの動作確認
- 現在の開発環境で使用しているNode.js、Vite、Reactでの確認

テストを追加する場合は、次を判断基準とします。

> このテストを追加しなかった場合、どの現実的な不具合を見逃すか。

具体的な不具合を説明できない場合は、原則としてテストを追加しません。

型システム、Node.js、Vite、Reactなど外部の仕組みが保証している挙動を重複してテストしないでください。また、実装のコピー、mockの自己検証、既存テストとの重複、内部実装への過度な依存を避けてください。

テスト件数やカバレッジの維持自体を目的にしません。

### Integration / compatibility / regression test

次のような重い検証は通常実行しません。

- application全体を起動またはbuildするintegration test
- 複数Node.jsバージョンでの検証
- 複数Vite / Reactバージョンでの互換性検証
- Preactなど代替ランタイムの互換性検証
- 全playgroundのbuild
- 過去のIssueや特定環境向けの回帰テスト
- GitHub Actionsによるcompatibility matrix

これらは、関連する変更を行った場合や、不具合の再現・修正確認が必要な場合のみ明示的に実行します。

特定環境のバグ報告に対して再現テストを追加しても構いません。ただし、修正後にそのテストを通常のテストスイートへ恒久的に追加する必要はありません。再利用する価値がある場合は、必要時のみ実行するregressionまたはcompatibility testとして残してください。

GitHub Actionsの`Compatibility CI`も通常の変更では実行せず、互換性確認が必要な場合のみ対象suiteを手動実行します。

### CLIの検証

CLIそのものを変更した場合や、CLIの契約確認が必要な場合に限り、必要なfixtureに対して次を実行します。

```sh
minista check --json
minista inspect --json
minista build
```

すべてのCLI fixtureを一律に検証する必要はありません。

### 設計文書の検証

`design/architecture.md` の「Current」は実装済みの事実だけを記載します。未実装、上流待ち、experimental、移行条件は `design/roadmap.md` に置きます。移行期間中だけ、同ファイル内のCurrentとTargetを明示的に分けます。

## Command execution

- テスト、ビルド、型チェックは、変更内容の確認に必要な最小限の範囲だけ実行する。
- 指示がない限り、全integration test、compatibility matrix、全playground buildへ検証範囲を自動的に拡大しない。
- 小さな変更に対して、成功済みの検証を別条件で繰り返さない。
- 検証が必要十分に成功した時点で終了する。
- 時間のかかるコマンドは、1秒程度の短い間隔で繰り返し状態確認しない。過去の実行時間や処理内容を踏まえて十分に待ってから確認する。
