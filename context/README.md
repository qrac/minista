# minista v5 context

contributorとAI coding tool向けの内部設計資料です。作業に関係する文書・節だけを参照してください。通読や固定の読む順番は不要です。

## 目的別の参照先

| 作業・確認したいこと | 参照先 |
| --- | --- |
| Core／Feature／adapterの責務・依存方向 | [architecture.mdのLayer boundary](architecture.md#layer-boundary) |
| Graph・phase・feature依存・Artifactの契約 | [architecture.mdの実装contract](architecture.md#coreとfeatureの実装contract) |
| 公開API・型・互換性 | [architecture.mdの公開API](architecture.md#public-api-compatibility-summary)、[型境界](architecture.md#public--internal-type-boundary) |
| Viteのbuild／dev・experimental API・fallback | [vite.md](vite.md) |
| 個別機能の設計理由・却下案 | [ADR索引](decisions/README.md)から該当する判断 |
| テストの選択・実行方法 | [testing.md](testing.md) |
| 未実装・上流待ち・再検討条件 | [roadmap.md](roadmap.md) |
| v5への移行・完了済み変更 | [release-notes-v5.md](release-notes-v5.md) |
| 性能比較・過去の測定条件 | [benchmarks/](benchmarks/) |

## 文書の更新

- 構造変更では関係する設計資料とADRを同時に更新する。`architecture.md`は実装済みの事実、`roadmap.md`は未実装・experimental・移行条件を扱う。
- Vite APIの採用状態・fallback・[Build用語](vite.md#build用語)は`vite.md`に集約する。外部APIのstatusには公式資料と確認日を添える。
- machine-readable schemaには`schemaVersion`を持たせ、互換性方針を該当ADRへ記録する。
- ADRのContext・却下案、レビュー、benchmarkは記録時点の情報。過去の検証記録や完了条件は、新しい作業で一律に実行する指示ではない。

## レビュー記録

必要な問題の経緯を調べる場合に参照します。

- [v5設計レビュー](reviews/2026-09-05-v5.md)、[実装確認](reviews/2026-09-05-implementation-checkpoint.md)
- [プラグイン改善計画と完了記録](reviews/2026-09-08-plugin-improvement-plan.md)（P01〜P11完了）
- [Astra向け指示・参照構成の整理](reviews/2026-09-21-agent-context.md)
