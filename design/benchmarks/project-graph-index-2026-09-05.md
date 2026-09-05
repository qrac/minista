# Project Graph index benchmark

測定日: 2026-09-05

## 目的

Route patternとPage URLの重複検出を全件走査から内部indexへ変更した効果を確認します。公開snapshotの生成時間は含めず、RouteNodeとPageNodeを同数ずつ順に登録するGraph構築だけを測定しました。

## 条件

- macOS Darwin 25.6.0 arm64
- Node.js 26.2.0、`--expose-gc`
- 改善前: commit `94b3c3c`の`ProjectGraph`
- 改善後: 同commitを基点にURL→PageId、pattern→RouteIdのMapを追加したworking tree
- 各件数で5回実行し、実行前に`global.gc()`を呼び、wall-clock timeと`heapUsed`増分の中央値を記録
- node ID、source path、pattern、URLは各nodeで一意。Routeを全件登録した後にPageを全件登録

## 結果

| Page数 | 改善前 | 改善後 | 高速化 | heap増分（前→後） |
| ---: | ---: | ---: | ---: | ---: |
| 1,000 | 19.41ms | 2.15ms | 9.0倍 | 2.17→1.10MiB |
| 10,000 | 1,193.96ms | 17.62ms | 67.8倍 | 17.31→10.99MiB |

重複検出が登録ごとの全Map走査からMap lookupへ変わり、Graph構築はO(N²)からO(N)になりました。heap値はGCとV8の割当てタイミングに影響されるため参考値です。indexの追加自体はMapを2個増やしますが、この測定では全件走査が作るiterator／一時配列がなくなり、登録中のheap増分も減りました。

## 整合性検証

unit testで次を固定しました。

- pattern／URL重複時に既存nodeとindexを変更しない
- Route／Page更新時に旧keyを削除して新keyへ張り替える
- Page削除とRoute削除時にindexを削除し、Route削除では配下Pageも削除する
- `ProjectGraph.fromSnapshot()`で復元したGraphにも同じindex queryが使える
