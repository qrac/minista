# minista v5 design

このディレクトリは、公開ドキュメント `docs/` とは分離したcontributor / AI coding tool向けの内部設計資料です。特定のAI製品には依存しません。

## 読む順番

1. [`architecture.md`](architecture.md): 現行v4由来実装の事実と、v5で採用する目標構造
2. [`vite.md`](vite.md): Viteとの境界、APIの安定度、build / dev方針
3. [`roadmap.md`](roadmap.md): 段階移行、完了条件、上流待ち
4. [`decisions/`](decisions/): 重要な設計判断と却下案

## 文書の状態

| 文書 | 扱う内容 | Futureを含めるか |
| --- | --- | --- |
| `architecture.md` | Currentの事実。移行期間中のみTargetを明示分離して併記 | 移行完了まで限定的に含む |
| `roadmap.md` | 未実装、experimental、上流待ち、移行条件 | 含む |
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
