# ADR-0002: Project Graphと明示的Build Phase

- Status: Accepted
- Date: 2026-08-12
- Amended: 2026-09-05 by [ADR-0015](0015-application-lifecycle-and-output-transaction.md)

## Context

現行featureの共有値は主に `{ url, fileName, html }` で、asset / island / image / client entryはHTMLを再解析して推測します。feature間の順序はVite plugin配列、`enforce`、hook timing、temp fileの存在に埋め込まれています。

## Decision

versioned Project Graph、Artifact Store、structured Diagnosticをlifecycleの中心にします。phaseは `discover`, `resolve`, `render`, `analyze`, `generate`, `bundle`, `compose`, `emit`, `finalize` とします。

- graph nodeは決定的なbranded IDを持つ
- phaseごとにread modelと許可されたcommandを限定する
- featureはcapabilityとdependencyを宣言しtopological sortする
- optional feature間の順序は、対象が存在する場合だけ有効な `optionalAfter` で宣言する
- HTMLはfinal outputかdocument representationであり、feature間の唯一のprotocolにしない
- `.minista/work/<buildId>` はmetadata付きArtifactStoreとし、globで前回buildのexecutable fileを探さない
- emit後のfinalizeはEmitterの明示的な `replace()` と追加 `emit()` だけで出力を変更する
- adapterがstructured diagnosticを持つerrorを投げた場合、runnerはstable code、hint、locationを保持し、欠けているphaseとfeatureだけを実行contextから補う
- public manifestはgraphの安全なprojectionとする

compatibility facadeを段階移行する間も、参照解析、成果物生成、document反映は同じdomain contractとadapterを使用します。Imageではdev／buildを一つの `ImageGenerator` portへ接続し、facade closureにrecipe、remote index、出力entryのmutable mapを保持しません。local sourceと生成patternのcache invalidationはcontent hashをadapterが管理します。remote sourceはURLのhash keyとHTTP validatorをcache manifestへ保存し、既定のimmutable cacheまたは`maxAge`後の条件付き再検証を選択します。local source読込、remote download、Sharp metadata／transform、cache errorはoperation別のstable diagnosticへ変換し、remote URLのqueryはmessageとcache manifestへ含めません。ArchiveではArchiver由来errorを `MINISTA_ARCHIVE_FAILED` に変換し、runnerがfinalize phaseとfeature identityを維持します。Spriteではsource探索、filesystem読込、SVG／symbol parse、SVGO最適化のerrorをoperation別のstable diagnosticへ変換します。共有HTML document adapterではparse、selector query、mutation、serializeのerrorをpage node ID付きのstable diagnosticへ変換し、runnerがphaseとfeatureを補います。Svg source resolverもmissing sourceだけを未解決として扱い、filesystem読込、SVGO、fragment parseの失敗をstable diagnosticへ変換します。Entry、Bundle、Islandではbundlerをportとして扱い、Vite outputから得たplanをdomain composeへ渡します。Vite hookが所有するbundle object自体はCoreやfeatureへ渡しません。programmatic build間で必要なrendered pageとIsland snippetはCLIが所有するbuild-session ArtifactStoreへ保存し、inline Vite configに明示的なsessionとして渡します。

全featureのVite output operationをadapterで集約し、descriptorの依存順にdispatchします。各feature内のphaseはscope付きrunnerで実行し、error diagnosticがあるphaseの終了時点で停止します。単一global phase loopとの区別はADR-0015を参照してください。

## Consequences

- routeからoutput artifactまで機械的に追跡できる
- order cycle、missing capability、artifact conflictをbuild前に診断できる
- model/schema designとmigration policyが必要になる
- HTML parserだけで完結していた小機能もnode ownershipを意識する必要がある

## Rejected alternatives

### Event busのみを導入する

producer/consumerの時間的結合は弱まりますが、最終状態とdependency edgeをqueryできず、replay / inspect / explainに不十分です。

### すべてimmutable snapshotとして複製する

安全ですが、page/asset数が多いprojectでmemory costが高くなります。外部にはreadonly viewを渡し、内部command handlerが検証付きで更新する方式を採用します。

### HTML ASTをProject Graph全体として永続化する

parser implementationとschemaが強く結合し、manifestが巨大になります。HTML documentはbuild session内artifactとし、public manifestにはreferenceと要約だけを残します。

## Reconsider when

phaseの間に必須data dependencyが表現できない実例が出た場合、phase追加より先に既存phaseのinput/outputまたはcapability modelを再検討します。
