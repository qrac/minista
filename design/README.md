# minista v5 design

このディレクトリは、公開ドキュメント `docs/` とは分離したcontributor / AI coding tool向けの内部設計資料です。特定のAI製品には依存しません。

## 読む順番

1. [`architecture.md`](architecture.md): v5に実装されている現在の構造
2. [`vite.md`](vite.md): Viteとの境界、APIの安定度、build / dev方針
3. [`release-notes-v5.md`](release-notes-v5.md): v5再設計で完了した変更の要約
4. [`roadmap.md`](roadmap.md): Stageの完了状態、experimental、上流待ち
5. [`decisions/`](decisions/): 重要な設計判断と却下案

性能比較の測定条件と結果は [`benchmarks/`](benchmarks/) に記録します。

## 改善計画

- [プラグインの設計・機能・依存改善計画（2026-09-08）](reviews/2026-09-08-plugin-improvement-plan.md): 各プラグインの評価、再現した問題、優先順位、作業単位と完了条件。実装進捗は同文書で追跡する。

## 文書の状態

| 文書 | 扱う内容 | Futureを含めるか |
| --- | --- | --- |
| `architecture.md` | Currentの実装済み事実 | 含まない |
| `release-notes-v5.md` | v5 Stage 0〜8で完了した変更 | 含まない |
| `roadmap.md` | Stageの完了状態、experimental、上流待ち、再検討条件 | 含む |
| `vite.md` | Vite境界とAPI採用レベル | 含む |
| ADR | 採用理由、却下案、再検討条件 | 含む |

## 更新ルール

- コードが先行して文書と矛盾しないよう、構造変更と同じ変更セットで更新する。
- 日本語と英数字の間には一律のスペースを入れない。インラインコードやMarkdown構文との境界は可読性に応じて空けてもよい。
- `architecture.md` のCurrentに未実装の型・コマンド・ディレクトリを書かない。
- 外部APIのstatusは公式資料と確認日を添える。
- machine-readable schemaには `schemaVersion` を持たせ、互換性方針をADRに残す。

## Build用語

標準表現は「Vite Environment APIを利用し、render／client environmentを単一のVite app buildで順にビルドする」とします。各environmentのbundleは分離したまま、Ministaのbuild lifecycleとbuild sessionを共有します。

| 用語 | 意味 |
| --- | --- |
| Vite Environment API | 複数のenvironmentを扱うViteの仕組み |
| Vite app build | 複数environmentのビルドをまとめて制御する実行単位。通常のMinista buildでは`createBuilder()`／`builder.buildApp()`を使用する |
| render environment | SSG用のNode.js向けbundleを生成する環境。Ministaはその出力を評価してpageをrenderする |
| client environment | browser向けのJS／CSS／assetをbundleし、生成HTMLとともに出力する環境 |
| build lifecycle | Minista側でビルド全体の処理・phase・終了処理を管理する流れ |
| build session | buildId、Artifact Store、diagnosticsなどをビルド中に共有する状態とその有効範囲 |
| bundle | 各environmentが生成する出力。renderとclientでは分離する |

本文・見出しとも概念名は「Vite app build」に統一します。API名の`buildApp()`、pluginの`buildApp` hook、実装名の`ViteAppBuilderAdapter`、既存の識別子やファイル名は維持します。ADR・レビュー・benchmarkは記録時点の判断、実装状況、測定条件を保ち、用語だけを整理します。compatibility fallbackは通常のVite app buildと区別して記述します。

表記の確認: [Vite Environment API for Frameworks](https://vite.dev/guide/api-environment-frameworks#environments-during-build)（2026-09-11）。

## Decision log

- [ADR-0001: Core / Feature / Vite Adapterの分離](decisions/0001-core-feature-vite-adapter.md)
- [ADR-0002: Project Graphと明示的Build Phase](decisions/0002-project-graph-and-phases.md)
- [ADR-0003: Vite app buildによる単一build lifecycle](decisions/0003-vite-app-build.md)
- [ADR-0004: 公開plugin APIをcompatibility facadeとして維持](decisions/0004-plugin-api-compatibility.md)
- [ADR-0005: React static rendererを交換可能にする](decisions/0005-react-static-renderer.md)
- [ADR-0006: ランタイム実装をJavaScript + JSDocに統一する](decisions/0006-javascript-jsdoc-runtime.md)
- [ADR-0007: programmatic custom serverからModuleRunner devへ移行する](decisions/0007-programmatic-module-runner-dev.md)
- [ADR-0008: 公開Project Manifestを安全かつ原子的に出力する](decisions/0008-public-project-manifest.md)
- [ADR-0009: 直近のstructured diagnosticsをworkspace snapshotへ保存する](decisions/0009-diagnostics-workspace-snapshot.md)
- [ADR-0010: feature output ownershipを明示的なclaimでGraphへ統合する](decisions/0010-explicit-output-claims.md)
- [ADR-0011: read-only queryをinternal package boundaryとして公開する](decisions/0011-internal-read-only-query-boundary.md)
- [ADR-0012: 外部buildのdata handoffをschema付きJSONにする](decisions/0012-json-external-build-handoff.md)
- [ADR-0013: SSGをpage formatとrender assetのcomposition rootにする](decisions/0013-ssg-page-formats-and-render-assets.md)
- [ADR-0014: Layoutのdocument rootを既存Head APIと合成する](decisions/0014-layout-document-root.md)
- [ADR-0015: application lifecycle集約と出力transaction](decisions/0015-application-lifecycle-and-output-transaction.md)
- [ADR-0016: 生成workspaceの統一とagent向け入口](decisions/0016-workspace-and-agent-guide.md)

- [ADR-0017: Beautifyの整形境界とSSGのimage preload方針](decisions/0017-beautify-output-and-ssg-preload.md)

- [ADR-0018: Archiveのstream出力port](decisions/0018-archive-stream-publication.md)

- [ADR-0019: HTML参照Entryの公開APIをSSGへ統合する](decisions/0019-ssg-entry-composition.md)
