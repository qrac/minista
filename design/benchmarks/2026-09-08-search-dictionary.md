# Search辞書のMap化（2026-09-08）

P06のindex生成だけを比較する。baselineは`4c7f725e0006f7fc6c4202d65f167f7f0b4391b1`、変更後は同commitにP06の作業差分を適用した状態。

## 再現条件

```sh
node scripts/benchmark-search.js 4c7f725e0006f7fc6c4202d65f167f7f0b4391b1
```

Node.js v26.2.0、macOS、process.arch=x64。各条件・各実装をfresh processで3回実行し、中央値を記録した。全体テストとCLIの終了後に単独実行した（OS上の他処理は制御しない）。warmupなし。baseline関数は指定git refの実装から抽出し、変更後と同じ合成解析recordを渡す。全sampleでJSONのSHA-256一致をassertする。

語彙は`word000000`形式の固定長文字列。各pageのtitleは1token、contentは語彙を巡回する連続token、wordsはtitle＋contentとする。hitは全文字種有効・minLength=1。下表の総token数はtitle＋contentで、解析recordのwords配列にも同じtoken参照を格納する。

時間は入力生成と事前GCの後からindex生成完了まで（JSON serializeを含まない）。heapは同区間のheapUsed差分でありpeakでもGC後の保持量でもない。RSSはprocess全体のmaxRSSで入力・module初期化を含む。Mapの追加メモリとGCのタイミングが結果に影響するため、メモリ削減を保証する測定ではない。

## 結果

各値は変更前→変更後。時間はms、メモリはMiB。

| ページ数 | 語彙数 | 総token数 | 時間 | heap差分 | peak RSS |
| --- | --- | --- | --- | --- | --- |
| 1 | 1,000 | 1,001 | 6.98 → 5.17 | 1.34 → 0.75 | 59.09 → 57.04 |
| 1 | 10,000 | 10,001 | 124.76 → 16.13 | 1.47 → 0.78 | 61.85 → 61.59 |
| 100 | 1,000 | 100,100 | 99.02 → 41.36 | 3.63 → 3.76 | 73.53 → 70.74 |
| 100 | 10,000 | 100,100 | 751.30 → 48.54 | 4.72 → 6.36 | 75.11 → 74.88 |
| 1,000 | 10,000 | 1,001,000 | 7622.19 → 185.19 | 39.69 → 41.35 | 144.42 → 144.72 |

辞書参照は語彙数に比例する線形探索からMap lookupへ変わる。語彙整列・tokenのflatten・page整列は残る。大規模入力の時間は改善するが、Mapの追加割当てによってheap差分が増える条件もある。

DOM解析、mojigiri、Vite起動、JSON転送、query実行、React描画の性能は測定対象外。query engineの分離は順位・同点順・抜粋起点・toc・literal検索・初回取得の回帰テストで検証し、検索品質は変更していない。新しい検索libraryは採用しない。

## 生データ

```jsonl
{"node":"v26.2.0","platform":"darwin","arch":"x64","baseline":"4c7f725e0006f7fc6c4202d65f167f7f0b4391b1"}
{"pages":1,"vocabulary":1000,"contentTokens":1000,"mode":"before","samples":[{"ms":8.21674999999999,"heapMiB":1.3412246704101562,"rssMiB":59.203125,"sha256":"dadc9d1d0ea55c87cf23beb1c64e9b86eafc2d8cc7deb5910571274c23aacd25"},{"ms":6.983542,"heapMiB":1.3415374755859375,"rssMiB":59.09375,"sha256":"dadc9d1d0ea55c87cf23beb1c64e9b86eafc2d8cc7deb5910571274c23aacd25"},{"ms":6.278458999999998,"heapMiB":1.6335678100585938,"rssMiB":58.875,"sha256":"dadc9d1d0ea55c87cf23beb1c64e9b86eafc2d8cc7deb5910571274c23aacd25"}]}
{"pages":1,"vocabulary":1000,"contentTokens":1000,"mode":"after","samples":[{"ms":5.170083000000005,"heapMiB":0.7462539672851562,"rssMiB":57,"sha256":"dadc9d1d0ea55c87cf23beb1c64e9b86eafc2d8cc7deb5910571274c23aacd25"},{"ms":6.968666999999996,"heapMiB":0.8300628662109375,"rssMiB":57.04296875,"sha256":"dadc9d1d0ea55c87cf23beb1c64e9b86eafc2d8cc7deb5910571274c23aacd25"},{"ms":5.0687500000000085,"heapMiB":0.7465667724609375,"rssMiB":57.16015625,"sha256":"dadc9d1d0ea55c87cf23beb1c64e9b86eafc2d8cc7deb5910571274c23aacd25"}]}
{"pages":1,"vocabulary":10000,"contentTokens":10000,"mode":"before","samples":[{"ms":120.838334,"heapMiB":1.0356597900390625,"rssMiB":61.515625,"sha256":"0648072a74aca98e211ab7dc72ee524e8c69e5fe56d1a21d9cbb774889621761"},{"ms":133.84995799999996,"heapMiB":1.4805526733398438,"rssMiB":61.8515625,"sha256":"0648072a74aca98e211ab7dc72ee524e8c69e5fe56d1a21d9cbb774889621761"},{"ms":124.758917,"heapMiB":1.4700164794921875,"rssMiB":62.08984375,"sha256":"0648072a74aca98e211ab7dc72ee524e8c69e5fe56d1a21d9cbb774889621761"}]}
{"pages":1,"vocabulary":10000,"contentTokens":10000,"mode":"after","samples":[{"ms":16.12770900000001,"heapMiB":0.7841644287109375,"rssMiB":61.828125,"sha256":"0648072a74aca98e211ab7dc72ee524e8c69e5fe56d1a21d9cbb774889621761"},{"ms":15.650249999999986,"heapMiB":1.2419967651367188,"rssMiB":61.5859375,"sha256":"0648072a74aca98e211ab7dc72ee524e8c69e5fe56d1a21d9cbb774889621761"},{"ms":16.136875000000003,"heapMiB":0.5781326293945312,"rssMiB":61.51171875,"sha256":"0648072a74aca98e211ab7dc72ee524e8c69e5fe56d1a21d9cbb774889621761"}]}
{"pages":100,"vocabulary":1000,"contentTokens":100000,"mode":"before","samples":[{"ms":100.65437500000002,"heapMiB":3.633544921875,"rssMiB":72.96875,"sha256":"35524954d9718d718590482ba257dd11745d4858976d509fa232c2dcfc333ae0"},{"ms":99.02016700000001,"heapMiB":3.633544921875,"rssMiB":73.74609375,"sha256":"35524954d9718d718590482ba257dd11745d4858976d509fa232c2dcfc333ae0"},{"ms":98.66216700000001,"heapMiB":3.633544921875,"rssMiB":73.52734375,"sha256":"35524954d9718d718590482ba257dd11745d4858976d509fa232c2dcfc333ae0"}]}
{"pages":100,"vocabulary":1000,"contentTokens":100000,"mode":"after","samples":[{"ms":45.42837500000002,"heapMiB":3.7637863159179688,"rssMiB":70.73828125,"sha256":"35524954d9718d718590482ba257dd11745d4858976d509fa232c2dcfc333ae0"},{"ms":41.35691699999998,"heapMiB":3.7635726928710938,"rssMiB":71.3046875,"sha256":"35524954d9718d718590482ba257dd11745d4858976d509fa232c2dcfc333ae0"},{"ms":40.02437500000002,"heapMiB":3.77191162109375,"rssMiB":70.39453125,"sha256":"35524954d9718d718590482ba257dd11745d4858976d509fa232c2dcfc333ae0"}]}
{"pages":100,"vocabulary":10000,"contentTokens":100000,"mode":"before","samples":[{"ms":755.767,"heapMiB":4.7172698974609375,"rssMiB":75.11328125,"sha256":"0d7cee4216b46ea25f4e7e739dcbaa7f6ae7d86c94ea9a19408c9fc726083574"},{"ms":751.3037919999999,"heapMiB":4.7172698974609375,"rssMiB":75.1015625,"sha256":"0d7cee4216b46ea25f4e7e739dcbaa7f6ae7d86c94ea9a19408c9fc726083574"},{"ms":732.947,"heapMiB":4.7172698974609375,"rssMiB":75.609375,"sha256":"0d7cee4216b46ea25f4e7e739dcbaa7f6ae7d86c94ea9a19408c9fc726083574"}]}
{"pages":100,"vocabulary":10000,"contentTokens":100000,"mode":"after","samples":[{"ms":49.42879100000002,"heapMiB":6.364006042480469,"rssMiB":75.10546875,"sha256":"0d7cee4216b46ea25f4e7e739dcbaa7f6ae7d86c94ea9a19408c9fc726083574"},{"ms":47.97745900000001,"heapMiB":6.364006042480469,"rssMiB":74.87890625,"sha256":"0d7cee4216b46ea25f4e7e739dcbaa7f6ae7d86c94ea9a19408c9fc726083574"},{"ms":48.542542000000026,"heapMiB":6.3626556396484375,"rssMiB":74.6953125,"sha256":"0d7cee4216b46ea25f4e7e739dcbaa7f6ae7d86c94ea9a19408c9fc726083574"}]}
{"pages":1000,"vocabulary":10000,"contentTokens":1000000,"mode":"before","samples":[{"ms":6644.113125,"heapMiB":39.68921661376953,"rssMiB":144.421875,"sha256":"2fb068cc365622fb171b305ec139a3b298bc54684da9591c057ec1877f7d5e93"},{"ms":7622.19325,"heapMiB":39.69105529785156,"rssMiB":144.078125,"sha256":"2fb068cc365622fb171b305ec139a3b298bc54684da9591c057ec1877f7d5e93"},{"ms":9376.4945,"heapMiB":39.689109802246094,"rssMiB":145.2734375,"sha256":"2fb068cc365622fb171b305ec139a3b298bc54684da9591c057ec1877f7d5e93"}]}
{"pages":1000,"vocabulary":10000,"contentTokens":1000000,"mode":"after","samples":[{"ms":178.210958,"heapMiB":41.34760284423828,"rssMiB":144.72265625,"sha256":"2fb068cc365622fb171b305ec139a3b298bc54684da9591c057ec1877f7d5e93"},{"ms":185.19287499999996,"heapMiB":41.34723663330078,"rssMiB":144.59375,"sha256":"2fb068cc365622fb171b305ec139a3b298bc54684da9591c057ec1877f7d5e93"},{"ms":187.122833,"heapMiB":41.347312927246094,"rssMiB":145.0234375,"sha256":"2fb068cc365622fb171b305ec139a3b298bc54684da9591c057ec1877f7d5e93"}]}
```
