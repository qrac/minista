# Archiveのstream出力測定（P11）

## 条件

2026-09-09、macOS arm64ホスト上のNode v26.2.0（darwin x64 process）、repository lockfileのarchiverを使用。入力は`input/data`の128MiB（1MiBずつcrypto.randomBytesで生成した圧縮しにくいbinary）。各modeは別processで実行し、同じ入力fileとmtimeを使う。ZIPは既定level 9、TARは既定option。

`process.resourceUsage().maxRSS`（KiB）はprocess全体のhigh-water markで、V8 heapだけではない。時間はdependency読込・圧縮・出力を含み、fixture生成を除く。各条件1sampleの参考値で、統計的な速度保証ではない。全サイトbuild、何万件もの小file、数GiB／ZIP64、ディスク逼迫、version matrixは測定していない。

## 変更前の必要性確認

変更前のNodeArchiveBuilderでchunk全収集→Buffer.concat→Uint8Array化し、MemoryEmitterのemit／listを経由して書いた。

| 形式 | 最大RSS KiB | 時間ms | 出力bytes |
| --- | ---: | ---: | ---: |
| ZIP | 720752 | 3673 | 134258827 |
| TAR | 642820 | 783 | 134219264 |

入力128MiBに対して約628〜704MiBを使うためstream化を採用した。最初のstream測定はZIP 172220KiB／3179ms、TAR 136172KiB／512msだった。

## 最終実装での再測定

全テスト終了後にtracked scriptで測定。buffered modeは従来と同じchunk収集・Emitter copy経路、stream modeは公開pluginと同じNodeArchivePublisherを使用する。途中の全テスト並行実行中の速度sampleは採用していない。

| 形式 | mode | 最大RSS KiB | 時間ms | 出力bytes |
| --- | --- | ---: | ---: | ---: |
| ZIP | buffered | 660780 | 3786 | 134258827 |
| ZIP | stream | 160432 | 3210 | 134258827 |
| TAR | buffered | 638476 | 736 | 134219264 |
| TAR | stream | 133008 | 517 | 134219264 |

最大RSSはZIPで75.7%、TARで79.2%減少した。ファイル全体のSHA-256は変更前・最終buffered・streamで一致した。

- ZIP: `7abc46c130a62e8e4cc5c0d9a1df6783d76b63c51c44614c0dab37034235de8e`
- TAR: `c4e5b43d85e422e3cddbcddc551ce0155b7a46a607b47a623bf0fea6120e5af5`

## 再実行

`ROOT/input/data`へ128MiBのbinaryを用意して、repository rootから実行する。全mode間で入力とmtimeを維持する。乱数入力を作り直した場合のhashは上記と異なる。

```sh
node scripts/benchmark-archive.js buffered zip ROOT
node scripts/benchmark-archive.js stream zip ROOT
node scripts/benchmark-archive.js buffered tar ROOT
node scripts/benchmark-archive.js stream tar ROOT
shasum -a 256 ROOT/buffered.zip ROOT/stream.zip ROOT/buffered.tar ROOT/stream.tar
```

scriptは指定ROOTの`buffered.zip`／`stream.zip`／`buffered.tar`／`stream.tar`を上書きする。測定後の入力と出力の削除は実行者が行う。比較対象のbuffer経路は内部APIとして残るため、過去commitのcheckoutは不要。

設計・cleanupとtransactionの保証範囲は[ADR-0018](../decisions/0018-archive-stream-publication.md)を参照。
