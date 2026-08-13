# ADR-0008: 公開Project Manifestを安全かつ原子的に出力する

- Status: Accepted with incremental migration
- Date: 2026-08-13

## Context

AI coding toolやCLIがroute、page、asset、artifactの関係を調べるたびにuser moduleを実行すると、応答時間、再現性、安全性が損なわれます。一方、build session内のProject Graphにはpage props、metadata、絶対pathになり得るruntime valueがあり、そのままJSON化すると秘密情報や実行時データがworkspaceへ残ります。

また、build中に直接 `manifest.json` を更新すると、中断やwrite失敗によってpartial JSONが残り、次のinspectが壊れた状態を正常なsnapshotとして読む可能性があります。

## Decision

公開Project ManifestはCoreのinternal graphとは別のschema v1とし、allowlist projectionだけで生成します。`PageNode.props`、metadata、module ID、絶対project root、plugin option、source本文は出力しません。project rootは常に `.` として表現します。

serializerはobject keyを再帰的にsortし、配列の意味上の順序を維持して、末尾改行を持つUTF-8 JSONを生成します。filesystem adapterは `.minista` と同じdirectoryに一時ファイルを書き、write完了後にrenameで `.minista/manifest.json` を置換します。失敗時は一時ファイルを削除し、以前のmanifestを維持します。

通常のApp Buildはclient output transactionのcommit後、build sessionに保存されたProject Graph snapshotからmanifestを生成します。schema migration、unsupported version diagnostic、legacy／外部CLI fallback、manifest直接読込によるinspectは段階的に追加します。

## Consequences

- toolは実行可能な一時moduleやarbitrary propsを読まずにproject構造を取得できる
- 同じmanifest valueは安定したJSON表現を持ち、差分とcache keyに利用できる
- manifest writeの中断でpartial JSONは公開pathに残らない
- dist transactionとmanifest renameは単一filesystem transactionではないため、build後のmanifest write失敗はbuild全体の失敗として報告する
- `createdAt` はbuild時刻なので、manifest file全体はbuild間でbyte-identicalにはならない

## Rejected alternatives

### Project GraphをそのままJSON化する

runtime-only valueと内部実装詳細がpublic contractへ混入し、schemaを安全に進化できないため採用しません。

### `manifest.json` へ直接writeする

process終了やdisk errorでpartial JSONを公開するため採用しません。

### JavaScript moduleとして出力する

inspectにcode executionが必要となり、read-only data contractにならないため採用しません。

## Reconsider when

- Node.jsが対象platform全体でより強いatomic replace primitiveを提供した場合
- manifest schema v2で署名、content hash、複数project rootが必要になった場合
- distとworkspace metadataを一つのtransactionとしてcommitできるEmitterが実装された場合
