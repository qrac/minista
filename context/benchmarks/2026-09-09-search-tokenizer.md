# Search tokenizer内製化（2026-09-09）

```sh
node scripts/benchmark-search-tokenizer.js
```

Node.js v26.2.0、macOS、x64。mojigiri 0.3.0の配布JSをtest helperへ固定した旧実装と、内部tokenizerを比較した。全体テストと同時実行せず、各条件・各実装をfresh processで5回測定した中央値。各processは入力の分割配列が完全一致することをassertし、10回warmup後にGCを実行してから測定する。入力は日本語・英数字・全角英字・記号・拡張漢字・emoji・空白・改行を含む58 UTF-16 code units。longはその1,000回反復。どちらも合計230万tokenを生成する。

時間はtokenizeの反復とtoken数加算（入力生成・import・一致検証・warmup・GCを除く）。heapは開始／終了のheapUsed差分でありpeakやGC後の保持量ではない。RSSはprocess全体のmaxRSSでimport・warmupも含む。OSの他処理とGCは制御しない。

各値は変更前→変更後。時間はms、メモリはMiB。

| 入力 | UTF-16長 | 呼出し数 | 時間 | heap差分 | peak RSS |
| --- | --- | --- | --- | --- | --- |
| short | 58 | 100,000 | 287.04 → 163.79 | 1.00 → 0.46 | 63.27 → 63.13 |
| long | 58,000 | 100 | 144.62 → 148.82 | 27.43 → 27.42 | 119.09 → 118.88 |

短いtextを頻繁に分割する条件で約43%短縮した。長文条件はほぼ同等であり、splitそのものの高速化やサイト全体のbuild時間短縮を示す測定ではない。今回の改善はパターン配列・RegExpの呼出しごとの生成を省くもの。titleの重複分割除去、DOM解析、辞書Map、query、React、Vite起動はこの測定に含めない。メモリ値はGC依存の参考値として扱う。

## 生データ

```jsonl
{"node":"v26.2.0","platform":"darwin","arch":"x64"}
{"name":"short","mode":"before","codeUnits":58,"count":100000,"samples":[{"ms":284.576167,"heapMiB":1.0048294067382812,"rssMiB":63.2421875,"tokens":2300000},{"ms":289.569208,"heapMiB":0.4808502197265625,"rssMiB":63.1796875,"tokens":2300000},{"ms":294.139625,"heapMiB":0.9968490600585938,"rssMiB":63.3671875,"tokens":2300000},{"ms":287.040667,"heapMiB":0.44710540771484375,"rssMiB":63.2734375,"tokens":2300000},{"ms":281.968208,"heapMiB":1.0456390380859375,"rssMiB":63.26953125,"tokens":2300000}]}
{"name":"short","mode":"after","codeUnits":58,"count":100000,"samples":[{"ms":163.987208,"heapMiB":0.410736083984375,"rssMiB":63.05078125,"tokens":2300000},{"ms":162.644167,"heapMiB":0.45662689208984375,"rssMiB":62.96484375,"tokens":2300000},{"ms":160.818167,"heapMiB":0.5976409912109375,"rssMiB":63.19140625,"tokens":2300000},{"ms":176.97220800000002,"heapMiB":0.27103424072265625,"rssMiB":63.1328125,"tokens":2300000},{"ms":163.79083399999996,"heapMiB":0.48757171630859375,"rssMiB":63.31640625,"tokens":2300000}]}
{"name":"long","mode":"before","codeUnits":58000,"count":100,"samples":[{"ms":145.85549999999998,"heapMiB":27.4263916015625,"rssMiB":118.87890625,"tokens":2300000},{"ms":143.551958,"heapMiB":27.4263916015625,"rssMiB":119.41796875,"tokens":2300000},{"ms":144.62229100000002,"heapMiB":27.4263916015625,"rssMiB":118.80078125,"tokens":2300000},{"ms":143.58345899999998,"heapMiB":27.4263916015625,"rssMiB":119.6484375,"tokens":2300000},{"ms":149.593083,"heapMiB":27.4263916015625,"rssMiB":119.0859375,"tokens":2300000}]}
{"name":"long","mode":"after","codeUnits":58000,"count":100,"samples":[{"ms":148.818959,"heapMiB":27.423423767089844,"rssMiB":118.77734375,"tokens":2300000},{"ms":148.91250000000002,"heapMiB":27.423423767089844,"rssMiB":119.00390625,"tokens":2300000},{"ms":145.41395800000004,"heapMiB":27.423423767089844,"rssMiB":118.8828125,"tokens":2300000},{"ms":142.295917,"heapMiB":27.423423767089844,"rssMiB":118.8515625,"tokens":2300000},{"ms":151.45820799999998,"heapMiB":27.423423767089844,"rssMiB":119.125,"tokens":2300000}]}
```
