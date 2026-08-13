# ADR-0009: 直近のstructured diagnosticsをworkspace snapshotへ保存する

- Status: Accepted with incremental migration
- Date: 2026-08-13

## Context

CLI stdoutだけにdiagnosticを出すと、AI coding toolや後続processは実行を再現しなければ結果を参照できません。`check` はuser moduleを評価するため、同じ情報を読むだけの用途で繰り返すと遅く、side effectも再実行します。

Project Manifestの `diagnosticSummary` は件数だけを持ち、stable code、location、hint、関連nodeを保持しません。一方、diagnostic messageにはuser code由来の情報が含まれ得るため、公開・配布用Project Manifestと同じcontractにはできません。

## Decision

`.minista/diagnostics.json` schema v1をworkspace内の直近実行snapshotとします。`schemaVersion`, `generator`, `command`, optionalな `buildId`, `summary`, `diagnostics`, `createdAt` を持ちます。

`check` は成功とvalidation errorの両方でreportを置換します。通常のApp Buildとprogrammatic legacy fallbackはclient outputのcommit後、成功したbuild sessionのdiagnosticsを保存します。別processの外部Vite CLI fallbackは両process成功後に空の成功reportを保存し、processの起動失敗、signal終了、非zero終了時は `MINISTA_VITE_CLI_FAILED` を持つ失敗reportを保存します。外部processのstderrは構造化せず、元のVite出力としてterminalへ維持します。programmatic build途中のstructured errorを失敗reportとして保存する接続は未実装です。

Project Manifest writerとDiagnostics writerは同じstable JSON serializerとatomic workspace writerを使います。同一directoryの一時ファイルへwriteした後でrenameし、失敗時は一時ファイルを削除します。

## Consequences

- toolは `check` を再実行せずstable codeとlocationを参照できる
- JSON key順と末尾改行が一定になり、差分とcache処理が安定する
- diagnostic reportはworkspace metadataであり、配布可能または秘密情報を含まないことを保証するartifactではない
- 外部Vite CLI fallbackの失敗はbuild IDとenvironmentを持つreportとして再利用できる
- programmatic buildの失敗reportは、収集済みdiagnosticをCLI保存境界へ接続した後に追加する
- manifestとdiagnosticsは個別にatomicですが、二つのfileを一つのtransactionとして置換する保証はありません

## Rejected alternatives

### Project Manifestへdiagnostic全文を埋め込む

安全な公開projectionとworkspace固有の実行結果を分離できなくなるため採用しません。

### stdoutをcaptureして保存する

human formatterの変更に依存し、stable codeやlocationを構造化したまま保持できないため採用しません。

## Reconsider when

- build例外がすべてstructured diagnosticへ変換された場合
- 複数metadata fileをまとめてcommitするworkspace transactionを実装した場合
- diagnostic retentionや履歴比較が必要になった場合
