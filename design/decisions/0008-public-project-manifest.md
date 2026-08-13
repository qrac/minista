# ADR-0008: 公開Project Manifestを安全かつ原子的に出力する

- Status: Accepted with incremental migration
- Date: 2026-08-13

## Context

AI coding toolやCLIがroute、page、asset、artifactの関係を調べるたびにuser moduleを実行すると、応答時間、再現性、安全性が損なわれます。一方、build session内のProject Graphにはpage props、metadata、絶対pathになり得るruntime valueがあり、そのままJSON化すると秘密情報や実行時データがworkspaceへ残ります。

また、build中に直接 `manifest.json` を更新すると、中断やwrite失敗によってpartial JSONが残り、次のinspectが壊れた状態を正常なsnapshotとして読む可能性があります。

## Decision

公開Project ManifestはCoreのinternal graphとは別のschema v1とし、allowlist projectionだけで生成します。`PageNode.props`、metadata、module ID、絶対project root、plugin option、source本文は出力しません。project rootは常に `.` として表現します。client build後はCore Output Manifestのsafe fieldsを `outputs` catalogへ複製し、PageにはURL規則で対応するHTML outputのfile nameとURLを付与します。bundle code、source本文、絶対facade pathは含めません。

`outputs` とPageの `output` はv1 readerでoptionalなadditive fieldとして扱い、現行writerは常に出力します。これにより初期v1 manifestをmigrationなしで読み続けられます。不正なoutput entryは `MINISTA_MANIFEST_INVALID` とします。

serializerはobject keyを再帰的にsortし、配列の意味上の順序を維持して、末尾改行を持つUTF-8 JSONを生成します。filesystem adapterは `.minista` と同じdirectoryに一時ファイルを書き、write完了後にrenameで `.minista/manifest.json` を置換します。失敗時は一時ファイルを削除し、以前のmanifestを維持します。

通常のApp Buildとprogrammatic legacy fallbackはclient output transactionのcommit後、build sessionに保存されたProject Graph snapshotからmanifestを生成します。`inspect --manifest` はfilesystem readerとCore parserを通してmanifestだけを読み、Vite serverやuser moduleを起動しません。schemaなし／構造不正は `MINISTA_MANIFEST_INVALID`、未対応versionは `MINISTA_MANIFEST_VERSION_UNSUPPORTED`、fileなしは `MINISTA_MANIFEST_NOT_FOUND` として返します。

readerはparse前に明示的なmigration registryを適用します。migrationは `from` と `to` を宣言し、一versionずつ変換します。v1が最初の公開schemaなのでbuilt-in registryは空です。cycle、同じversionからの重複migration、宣言したversionを返さない変換は `MINISTA_MANIFEST_MIGRATION_FAILED` とします。

別processの外部Vite CLI fallbackでは親CLIが一つのbuildIdを `MINISTA_EXTERNAL_BUILD_ID` としてrender/client processへ渡します。client SSG pluginはpublic schemaへprojection済みのmanifest候補だけをprivate `work/<buildId>/external` へ書き、親CLIが両processの成功を確認してから公開manifestへatomic replaceします。失敗時と昇格後はbuildId scopeを削除します。arbitrary graph dataや実行可能moduleはこのhandoffへ追加しません。

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
