# ADR-0018: Archiveのstream出力port

- Status: Accepted
- Date: 2026-09-09
- Amends: ADR-0001、0010、0015

## Context

P11の128MiB入力測定で、従来のchunk収集、Buffer.concat、Uint8Array化、Emitterへの保存・取得copyにより最大RSSがZIPで704MiB、TARで628MiBになった。Archiveはfinalize後に本文を他featureへ渡す必要がなく、共通Artifact schemaへのstream追加は不要である。

## Decision

Archive featureへ明示的な`ArchivePublisher.publish(options, fileName): Promise<void>` portを注入する。featureがfinalizeでrecipeとlogical output名を渡し、NodeArchivePublisherが圧縮、書込み、公開、cleanupを所有する。公開pluginは常にこのportを使う。既存の内部ArchiveBuilderとEmitter経路は小さなin-memory利用・差分検証のため維持する。streamもprivate pathもfeature、Artifact Store、Emitterへ渡さない。公開API、Artifact schema、capability、Beautify後の順序は変更しない。

Node adapterは同じArchiver option／glob／ignoreで生成し、Node pipelineのbackpressureにより出力先へ流す。公開先と同じdirectoryのUUID付き一時fileを排他的に作り、destinationのcloseを待ってrenameする。入力探索から一時fileと全設定済みarchiveを除外する。一時fileの作成から削除まで単一publish呼出しが所有する。成功時はrenameで消え、入力・圧縮・書込み・rename失敗時もfinallyで削除する。warningは従来どおりerrorにする。pipeline失敗ではstreamを破棄し、Archiverのqueue停止も試みる。初期化前TARのabortが投げる上流errorは元の書込みerrorを置き換えない。

adapterはoutput名のdirectory外への脱出を拒否する。featureは同名recipeを処理前に拒否する。成功したpublish群からVite adapterが明示claimを作り、既存の出力再照合で実在・byte sizeを確認する。公開manifestには従来のlogical fileName／ownershipのみが入り、private staging pathは入らない。file名からproducerを推測しない。

programmatic App／Legacyは既存のoutDir transaction内でpublishする。後続archive、post hook、metadata処理の失敗では、完成済みarchiveも含め旧outDirとmetadataへrollbackする。外部Vite CLI fallbackは従来どおりbuild全体のtransaction対象外だが、単一archiveのpartial fileは公開しない。

## Limits

ディスクには出力サイズ分の空き容量が必要。transaction backupと既存出力の保持分も必要になる。強制終了時の一時file回収、同一outDirへの同時build、filesystem自体のcleanup／rollback失敗、fsyncによる耐障害性は保証しない。Archiverのentry metadataや圧縮bufferは残るため、メモリ使用量を定数とは保証しない。

汎用file-backed ArtifactやstreamをCoreへ追加する案は、他featureの需要がないため採用しない。複数featureで同じ大容量出力を読む必要が生じた時点で、寿命・再読込・hash契約とともに再検討する。

## Validation

ZIP／TARのbyte一致、入力内出力と再生成、rename失敗、partial書込み失敗、実際のdestination error、path拒否をunitで検証する。実Vite fixtureで複数archive、欠落時rollback、公開manifestのownershipとprivate path非露出を検証する。[benchmark](../benchmarks/2026-09-09-archive-stream.md)へ測定を記録する。

参照仕様（2026-09-09確認）: [Archiver finalize／abort](https://www.archiverjs.com/docs/archiver/)、[Node stream pipeline](https://nodejs.org/api/stream.html#streampipelinesource-transforms-destination-callback)。
