# ADR-0011: read-only queryをinternal package boundaryとして公開する

- Status: Accepted
- Date: 2026-08-13

## Context

CoreにはProject GraphとProject Manifestを読むquery関数がありますが、CLIはfilesystem readerとCore関数を直接組み立てていました。このまま将来の`@minista/mcp`や他のtool adapterを追加すると、manifestの探索、schema validation、migration、query dispatchをadapterごとに再実装することになります。

一方、`minista`のroot exportへinternal schemaとqueryを追加すると、既存の公開plugin APIとAI tool向け基盤の互換性を同じ範囲で保証することになります。

## Decision

`minista/internal/query` subpathをread-only queryのpackage boundaryとします。この境界は`.minista/manifest.json`だけを読む`queryProject()`と、既に読み込んだmanifestを対象にする`queryProjectManifest()`を公開します。user moduleの実行、Vite serverの起動、build、filesystemへの書込みは行いません。

queryはdiscriminated requestを受け、`inspect`と`trace-page`を提供します。`trace-page`はPage IDまたはURLからRoute、consumer Asset、対応Artifact、最終Outputを安全なprojectionとして返します。不正なmachine requestは`MINISTA_QUERY_REQUEST_INVALID`を持つerrorにします。

CLIの`inspect --manifest`もこのboundaryを使用します。Coreの純粋query関数とNode filesystem adapterは引き続き分離し、boundaryだけが両者をcompositionします。

## Consequences

- CLI、MCP、将来のAI tool adapterが同じschema validationとquery結果を使用できる
- source解析やVite起動なしでroute → page → generated asset／artifact → outputを追跡できる
- rootの公開plugin APIへinternal query型を混在させない
- `internal` subpathはv5内のtool adapter向け契約であり、一般利用者向け公開APIとは別にversion管理する
- query追加時はrequestとresponseをmachine-readableかつread-onlyに保つ

## Rejected alternatives

### 各adapterがmanifest readerとCore queryを直接組み立てる

error code、migration、query semanticsがadapterごとに分岐するため採用しません。

### root exportからquery APIを公開する

compatibility facadeとinternal schemaの安定性範囲が混ざるため採用しません。

### query時にsource projectを再解析する

高速で安全なread-only tool利用という目的に反し、user module実行の副作用も生じるため採用しません。

## Reconsider when

- `@minista/mcp`を独立packageとして実装し、internal subpathより専用packageが適切になった場合
- Project Manifest schemaの互換性方針をmajor version単位へ変更する場合
