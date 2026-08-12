# minista v5 design

このディレクトリは、公開ドキュメント `docs/` とは分離した contributor / AI coding tool 向けの内部設計資料です。特定の AI 製品には依存しません。

## 読む順番

1. [`architecture.md`](architecture.md): 現行 v4 由来実装の事実と、v5 で採用する目標構造
2. [`vite.md`](vite.md): Vite との境界、API の安定度、build / dev 方針
3. [`roadmap.md`](roadmap.md): 段階移行、完了条件、上流待ち
4. [`decisions/`](decisions/): 重要な設計判断と却下案

## 文書の状態

| 文書 | 扱う内容 | Future を含めるか |
| --- | --- | --- |
| `architecture.md` | Current の事実。移行期間中のみ Target を明示分離して併記 | 移行完了まで限定的に含む |
| `roadmap.md` | 未実装、experimental、上流待ち、移行条件 | 含む |
| `vite.md` | Vite 境界と API 採用レベル | 含む |
| ADR | 採用理由、却下案、再検討条件 | 含む |

## 更新ルール

- コードが先行して文書と矛盾しないよう、構造変更と同じ変更セットで更新する。
- `architecture.md` の Current に未実装の型・コマンド・ディレクトリを書かない。
- 外部 API の status は公式資料と確認日を添える。
- machine-readable schema には `schemaVersion` を持たせ、互換性方針を ADR に残す。

## Decision log

- [ADR-0001: Core / Feature / Vite Adapter の分離](decisions/0001-core-feature-vite-adapter.md)
- [ADR-0002: Project Graph と明示的 Build Phase](decisions/0002-project-graph-and-phases.md)
- [ADR-0003: Vite App Build による単一 lifecycle](decisions/0003-vite-app-build.md)
- [ADR-0004: 公開 plugin API を compatibility facade として維持](decisions/0004-plugin-api-compatibility.md)
- [ADR-0005: React static renderer を交換可能にする](decisions/0005-react-static-renderer.md)
