# minista v5 design

このディレクトリは、公開ドキュメント `docs/` とは分離したcontributor / AI coding tool向けの内部設計資料です。特定のAI製品には依存しません。

## 読む順番

1. [`architecture.md`](architecture.md): v5に実装されている現在の構造
2. [`vite.md`](vite.md): Viteとの境界、APIの安定度、build / dev方針
3. [`release-notes-v5.md`](release-notes-v5.md): v5再設計で完了した変更の要約
4. [`roadmap.md`](roadmap.md): Stageの完了状態、experimental、上流待ち
5. [`decisions/`](decisions/): 重要な設計判断と却下案

性能比較の測定条件と結果は [`benchmarks/`](benchmarks/) に記録します。

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

## Decision log

- [ADR-0001: Core / Feature / Vite Adapterの分離](decisions/0001-core-feature-vite-adapter.md)
- [ADR-0002: Project Graphと明示的Build Phase](decisions/0002-project-graph-and-phases.md)
- [ADR-0003: Vite App Buildによる単一lifecycle](decisions/0003-vite-app-build.md)
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
