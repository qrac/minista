# ADR-0004: 公開plugin APIをcompatibility facadeとして維持

- Status: Accepted
- Date: 2026-08-12
- Amended: 2026-08-28 by [ADR-0013](0013-ssg-page-formats-and-render-assets.md)
- Amended: 2026-09-05 by [ADR-0015](0015-application-lifecycle-and-output-transaction.md)

## Context

利用者はVite configの `plugins` に `pluginSsg()`, `pluginMdx()`, `pluginImage()` 等を並べています。内部をfeature systemに変えるためにAPIを一括変更すると、v5 migration costが過大になります。一方、現行plugin orderを永続的なdomain contractにすると暗黙依存を固定化します。

## Decision

既存の `pluginXXX()` 名、主要option shape、component import、`defineConfig()` を維持します。戻り値は引き続きViteが受け取れる `PluginOption` ですが、内部ではmarker付きfeature descriptorと薄いadapterを生成します。

- userの配列順はVite source transformの通常semanticsには従う
- Minista domain phaseの順序はfeature dependency graphで決める
- v5でSSGの入力形式とrender asset保証へ統合された`pluginMdx()`／`pluginBundle()`は例外として削除する
- `pluginSsg()`のpath optionはproject root相対のslashなしをdefaultとし、従来の先頭slash付き表記もVite adapter境界で同じroot pathへ変換する
- accidental internal contract (`.minista` path、virtual ID、plugin name、generated source name) は互換対象外
- documented output URL / HTML semanticsの変更はmigration noteとdiagnosticを必要とする
- `--oneBuild` はv5で削除し、指定時は `MINISTA_CLI_OPTION_REMOVED` errorを返す

全descriptorを検証するadapter coordinatorがdomain output operationを依存順にdispatchします。source transformの通常Vite順序とは分離します。isSsrBuildを参照するconfigは既存Legacy経路を使用し、builder.buildApp callbackはMinistaが所有します。詳細はADR-0015を参照してください。

## Consequences

- 大半のuser configは変更不要
- 旧pluginと新featureの用語が移行期間中に併存する
- Vite pluginを直接introspectする非公式integrationは壊れる可能性がある
- option type testとgolden fixtureがcompatibility gateになる

## Rejected alternatives

### `features: []` という新configへ一括移行する

内部modelは明快ですが、既存projectを不必要に破壊するため却下します。将来additive shorthandとして提供することは妨げません。

### plugin配列順をそのままphase順とする

循環やmissing dependencyを検出できず、AIが安全に局所変更できる構造になりません。

## Reconsider when

次のmajorでVite plugin以外のpublic configurationが十分普及した場合でも、deprecated periodとcodemodなしに既存facadeを削除しません。

## Svg出力契約の修正（2026-09-08）

P02では最適化後の描画属性をallowlistでsource contractへ渡し、明示propsを優先します。任意属性の無条件コピーはmarkerやイベント属性まで取り込むため採用しません。`style`／`class`は属性全体の上書きとし、CSS宣言のmergeは行いません。欠落sourceの未解決markerを成功出力に残す動作は廃止し、`MINISTA_SVG_SOURCE_NOT_FOUND` errorにします。公開optionの追加は行わず、公開docsとmigration noteに記録します。devの参照管理・watch・cache invalidationはadapterに閉じ、内部IDの名前空間化はP09に残します。


## Archive入力契約の修正（2026-09-08）

P03では公開`archives[].srcDir`を省略可能にし、省略時はVite adapterで解決済み`build.outDir`を補います。明示した入力は維持し、Core feature／Node builderには必須`srcDir`を持つ解決済みrecipeだけを渡します。公開descriptorは解決前の設定も保持できます。既定`outName: "dist"`とproject内入力のarchive entryのproject相対prefixは維持します。project外入力のentryはsource basenameをprefixにし、絶対パスを含めません。

欠落入力は`MINISTA_ARCHIVE_SOURCE_NOT_FOUND`、非directory入力は`MINISTA_ARCHIVE_SOURCE_NOT_DIRECTORY` errorとし、存在する空directoryと全件ignoreの空archiveは許可します。探索中のENOENT warningも成功として無視せず`MINISTA_ARCHIVE_FAILED`へ接続します。空directoryまで禁止すると意図的に空の配布物を作る既存設定を壊すため採用しません。

同じ`archives`の全出力パスをNode adapterの明示的な除外入力として渡します。前回の同名archiveを取り込まず、任意のZIP／TARを一律除外することもしません。設定から削除・改名した過去のarchiveはuserの`ignore`で扱います。archiveは全件生成後に書き込み、成功出力だけをclaimへ登録する既存の仕組みを維持します。App／programmatic Legacyのoutput transactionが欠落失敗もrollbackします。streamingと大容量時のmemory改善はP11の範囲です。

## Islandの条件付きmodule読み込み（2026-09-09）

P07では`visible`／`media`／`idle`の条件成立時にsnippetとrendererをdynamic importします。`load`／`only`はentry実行時に直ちに取得を開始し、`only`だけcreateRootを使います。公開optionとdirectiveを維持し、moduleの副作用の評価時点が変わることをmigration noteへ記録します。

dev/buildは同じbrowser runtimeを使い、Reactのimportは遅延rendererへ分離します。生成workspaceへのruntime配置はadapterが所有し、featureのsource plan／phase契約を変えません。runtimeは要素ごとの開始を一度に制限し、同一entryのsnippet取得Promiseとrenderer取得Promiseを共有します。別entryからのmodule再利用はES module cacheに任せます。observer／media listenerは条件成立時に解除し、切り離された要素はhydrateしません。

失敗時はSSRを残し、自動retryせず、browser consoleへ`MINISTA_ISLAND_LOAD_FAILED`のstructured diagnosticを出します。directive設定失敗は`MINISTA_ISLAND_DIRECTIVE_FAILED`、未知directiveは`MINISTA_ISLAND_DIRECTIVE_UNKNOWN`です。これらはbrowser上の診断で、build workspace snapshotへは書きません。React自身が非同期に報告するrender errorはReactの既存挙動に従います。

CSSはViteのdynamic import処理に任せます。初期描画に必要なSSGのrender CSSは引き続きHTMLへ出力し、遅延JSまでstylesheetと一緒に先行取得することはしません。別の即時Islandや通常entryと共有されるmodule、利用者のchunk統合・preload設定まで取得遅延を保証しません。遅延moduleの失敗後のretryや消えた要素のobserver cleanupは別のnavigation lifecycleが必要になった際に再検討します。
