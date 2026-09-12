# ADR-0020: Searchの複数indexと解析Artifactの共有

- Status: Accepted
- Date: 2026-09-12

## Context

多言語サイトやdocs／blogを1ビルドで生成し、検索対象を独立したindexへ分けたい。既存の`pluginSearch({ src })`と`<Search />`、JSONの語彙・hit・page形式は維持する。featureをindex数だけ登録するとowner／capabilityが衝突し、共通ページの解析も重複する。

## Decision

### 公開API

- `indexes === undefined`では既存の単一index設定・既定値・JSON形式・出力名を維持する。
- `indexes`は空でないobjectで、各own keyをindex名にする。名前は`[a-zA-Z0-9][a-zA-Z0-9_-]*`。パスやURLではなく識別子として扱う。
- multi-indexの`src`／`ignore`／`outName`は各indexで指定し、トップレベルに指定した場合はerrorにする。省略時の`src`／`ignore`は既存の既定値、`outName`は`search-${name}`。重複した`outName`はerrorにする。
- `trimTitle`／`targetSelector`／`ignoreSelectors`／`hit`／`inputAttr`／`relativeAttr`はトップレベルから継承し、indexごとに上書きできる。`hit`はfield単位でmergeし、配列は結合せず置換する。
- `<Search index="ja" />`で選択する。multi-indexでは1件だけの設定でもindex必須。単一indexではindexを省略する。URLからの推測や先頭indexへのfallbackは設けない。
- multi-index JSONだけに`index: name`を追加する。`words`／`hits`／`pages`は既存形式。内容が同じindexや複数の空indexにも識別情報を残し、Viteのcontent deduplicationによる同一fileへの集約を防ぐ。単一indexのJSONには追加しない。

### FeatureとArtifact

Searchは1つのfeature descriptor／ownerのままとし、既存の`html-documents`→`search-data` capabilityとoptionalAfterを維持する。

`analyze`は`trimTitle`／`targetSelector`／`ignoreSelectors`が等しいindexをgroupにまとめる。各pageの出力HTML名で`src`／`ignore`を判定し、対象となるgroupごとに1回だけ共有Documentを解析する。analyzerはDOMを変更せず、同じparse treeを再利用する。`hit`は解析条件に含めず、index生成時に適用する。

page scopeの解析Artifactは、その解析結果を利用するindex名を保持する。multi-indexのIDはgroup代表名（index名の整列順）とpage IDで区別する。単一indexのIDとrecord形式は維持する。`generate`はArtifactのindex所属を使い、index別のSearchData Artifactと依存edgeを作る。空indexも出力する。`compose`は各indexのinput／relative属性に従って既存の相対階層属性を反映する。

### Vite adapterとcomponent

adapterは各ArtifactをViteへemitし、そのreference IDから確定file nameを取得する。index別のoutput claimには同じArtifact ID、出力名、検索対象page URLを登録する。公開Graphのclaimは既存と同じ境界で統合し、内部解析Artifactへの依存はcompatibility Graph内で保持する。

Search componentには名前・JSON参照・input／relative属性のtableをsource transformで渡す。dev／render／client、Vite app build／legacy renderで同じ検証関数を使う。generateBundleでtable内の参照literalを確定出力名へ解決し、minify後の引用符とshared chunkにも対応する。feature間のHTML markerや一時moduleは追加しない。

dev JSON endpointも同じ名前解決を使い、base付きURLに対応する。Comment／Svgの変換後の全RenderedPage集合が同じ間は、server closure内の直近snapshotから全indexのArtifactを再利用する。URL・HTML・件数の変更時は生成し直す。失敗結果はcacheしない。

`processViteDocuments()`はsessionのparse済みDocumentを再利用しながら、runnerには今回の入力集合だけを渡す。sessionに残る別URLのrequestや削除済みpageを解析へ混ぜない。page単位の増分Artifact保持は従来の`artifactUpdate`で制御し、Documentの入力範囲とは分離する。

componentのindex切替時は新しいJSONを取得し、古いrequestの応答を無視する。SSRしない`client:only`やbrowser内でのみ決まるpropsの検証はcomponentを実行するbrowserで行われる。

### Diagnostics

設定・参照エラーは`SearchIndexError.diagnostic`を持ち、既存runnerでphaseを補完する。コードは`MINISTA_SEARCH_INDEXES_INVALID`、`MINISTA_SEARCH_INDEX_NAME_INVALID`、`MINISTA_SEARCH_INDEX_OPTIONS_INVALID`、`MINISTA_SEARCH_OUTPUT_CONFLICT`、`MINISTA_SEARCH_INDEX_REQUIRED`、`MINISTA_SEARCH_INDEX_UNKNOWN`。参照の診断に利用可能なindex名を含め、SSRで検出したエラーはbuildの成功出力にしない。

## Rejected alternatives

- indexごとにplugin／featureを作る: ownerとlifecycleの重複、同一HTMLの再解析を招く。
- HTMLを必ず1回だけ走査する汎用解析model: selectorやtitle設定の異なるindexを正確に表現するためにDOM相当の中間形式が必要になり、過度に複雑になる。
- 全indexを単一JSONへ格納する: browserが不要な言語のデータも取得する。
- 空indexだけ特別な出力命名処理を持つ: Viteの命名規則やhashを再実装する必要がある。JSONのindex識別情報で独立出力を保つ。

## Verification

unitでlegacy設定、継承、無効設定、重複出力名、解析回数、Artifact所属と依存、削除pageの除去、componentのfetchと切替を確認する。実Viteでbase付きdev、Vite app build、legacy buildのJSON一致、言語分離、空index、hash付き出力とclaim、SSRのmissing／unknown診断を検証する。公開型テストはpack済みpackageも使う。

## Reconsider when

大規模サイトで変換済みHTMLの比較やselector別走査が律速になった場合に、計測してpage単位の差分解析を検討する。URLによる自動index選択や言語別tokenizerは別の公開API検討とする。
