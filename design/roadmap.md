# v5 roadmap

最終確認日: 2026-08-13

この文書には未実装の計画、上流待ち、experimental機能、移行完了条件を記載します。各段階は小さくmerge可能にし、公開APIと出力互換性をfixtureで固定してから内部を差し替えます。

## Guiding constraints

- 一度に全pluginを書き換えない
- 現行buildとv5 lifecycleをfixtureごとに比較できる期間を持つ
- public facadeとinternal feature contractを同じcommitで切り替えない
- Vite experimental APIが変わってもCore / graph schemaを変更せずadapterだけで追従できる状態を保つ
- manifest schemaはcode internal typeより小さく、秘密情報とarbitrary propsを含めない

## Stage 0: baselineを固定する

進捗: representative fixtureにSSG、Head、Image、Entry、Island、Searchをまとめ、現行HTML / asset / executable temp handoffをintegration testで固定しました。全pluginのruntime exportとfeature metadataも検証しています。公開optionのcompile-time type testとfailure fixtureの拡充は継続します。

最初に実装すべき段階です。

- playgroundから代表fixtureを選び `test/fixtures` に固定する
- current buildのHTML、asset、island、image、search outputをgolden dataとして記録する
- `pluginXXX()` のexport / option type / defaultをtype testにする
- 二回buildとdev requestのintegration harnessを追加する
- current `.minista` producer / consumerをtest名とmatrixに明記する
- build failure、dynamic route param不足、重複routeの現状挙動を記録する

完了条件: 内部変更なしでもcompatibility suiteがcurrent outputを再現し、差分をレビューできる。

## Stage 1: Core skeletonとJavaScript + JSDoc移行

進捗: 完了。diagnostics、graph、lifecycle scheduler/runner、memory ArtifactStore/Emitter、manifest projection、query service、port interfaceをJavaScript + JSDocで実装しました。Core、SSG feature、React/Vite adapterのruntime `.ts` は残っておらず、事前buildなしでCLIとunit/integration testを実行できます。

- `core/diagnostics`, `core/graph`, `core/lifecycle`, `core/artifacts` を追加
- branded ID、ProjectPath、JsonValue、Diagnostic、phase eventを実装
- graph invariantとphase schedulerのpure unit testを追加
- `MemoryArtifactStore` とtest用 `MemoryEmitter` を先に作る
- runtime sourceを直接実行し、JSDocと隣接 `.d.ts` を `tsc --noEmit` で検査する方針を確立
- 初期TypeScript prototypeをJavaScript + JSDocへ移行

この段階では現行pluginのoutputを変更しません。Coreをside-by-sideで構築します。

完了条件: Vite / React / filesystemをimportしないCore unit testが事前buildなしで通り、runtime implementationに `.ts` が残っていない。

## Stage 2: discovery / route / page graph

進捗: 完了。route discovery、param parser、PageNode resolution、`getStaticData()` error/missing param diagnostics、ModuleEvaluator portを実装しました。CLIの `check`, `inspect`, `explain` はVite ModuleRunner adapterを通じて実際のpage moduleを評価します。legacy SSG build/devもcompatibility adapterを通じてRoute/Page Graphから現行renderer用pageへ投影します。

- SSGのglob code generationをroute discovery serviceへ移す
- route pattern parserとparam validationをpure function化
- `getStaticData` の実行を `ModuleEvaluator` portへ分離
- RouteNodeとPageNodeを生成し、最小の`RenderedPage`へcompatibility projectionする
- `minista check` と `check --json` をdiscovery / resolve範囲で追加
- duplicate route、missing param、invalid static dataをstructured diagnostic化

完了条件: current rendererを使ったまま、全pageがgraphから列挙される。現行URLとdraft挙動がfixtureで一致する。

## Stage 3: rendererとdocument composition

進捗: 完了。async `StaticRenderer` port、compatibility用 `ReactRenderToStringRenderer`、React 19 `prerenderToNodeStream()` を使う `ReactStaticRenderer` を追加しました。React 19ではstatic rendererをdefaultとし、Preact aliasを検出した場合とReact 18で `react-dom/static` を読み込めない場合はcompatibility rendererへ戻します。Suspense、`useId`、画像preload、render error、Head、doctype、実際のPreact aliasとIsland buildのfixtureを実装済みです。parser非依存の `HtmlDocument` contract、build session内の `HtmlDocumentStore`、`node-html-parser` adapterを追加し、markerとgraph node IDをbindしてから1回serializeできるcomposition入口を実装しました。

- `StaticRenderer` portを追加し、まずcurrent `renderToString` adapterを移設
- Head / html / body attributeのcompatibility testを拡充
- React 19の `prerenderToNodeStream` adapterを追加
- Suspense、error、preload、doctype、`useId`、Preact aliasの差分をfixtureで検証
- feature markerとgraph node IDを対応させる `HtmlDocument` abstractionを追加

default rendererの切替条件:

1. React 19 fixtureのoutputが互換policy内である
2. `Head` の一回render semanticsが維持される
3. Preact alias使用時はcurrent fallbackが明示される
4. stream errorが `MINISTA_RENDER_FAILED` に変換される

React公式はNode.jsではWeb Stream版 `prerender()` より `prerenderToNodeStream()` を推奨しているため、Node adapterは後者を第一候補にします。API名を `ReactSsrRenderer` にはせず、SSGの実態に合わせ `ReactStaticRenderer` とします。

## Stage 4: featureを明示phaseへ移す

進捗: 全公開pluginにmachine-readable feature metadataを追加しました。Comment、Svg、Beautify、Archive、Search、Sprite、Image、Entry、Bundleに加え、Islandも明示phaseへ分離しました。IslandはSWC source transformをadapterへ分離し、snippet参照を `analyze`、snippet／entry source planを `generate`、bundler portの結果を `bundle`、markerとCSS／script URLの反映を `compose` で扱います。EntryとIslandの通常のprogrammatic buildはrendered page／snippet Artifactをbuild-session `MemoryArtifactStore`から読み、domain処理へ委譲します。別processのVite CLI fallbackもbuildId scopeのschema付きJSON snapshotを使用し、SSG／snippetのexecutable temp module importを削除しました。production SSGもPage Graphを入力とするCore render phaseへ接続し、`RenderedPage` Artifactを生成します。Stage 4のdomain feature分離は完了し、fallback廃止とdevを含む単一の長寿命lifecycle化は未完了です。

移行順はdependencyが少ないものから進めます。

1. Comment / Svg: compose phase
2. Beautify / Archive: finalize phase
3. Search: analyze + generate
4. Sprite / Image: analyze + generate + compose
5. Entry / Bundle: analyze + bundle + compose
6. Island: source transform + analyze + generate + bundle + compose

各featureで行うこと:

- current optionをそのまま受けるpublic facadeを維持
- closure stateをphase context / graph nodeへ移す
- `.minista/ssg/*.mjs` の読込を削除
- HTMLの再parseを一つのdocument composition pipelineに統合
- capabilityとartifact ownershipを宣言
- current output比較testとfeature unit testを追加

完了条件: featureがrendered page dataを実行可能temp moduleからimportしない。

## Stage 5: Vite app build adapter

進捗: 完了。通常buildは単一 `createBuilder(config, false)` で `render → prepareClient → client` を実行する `ViteAppBuilderAdapter` を既定経路として使用します。render/client environmentを明示する `createViteAppConfig()`、解決済みclient configにlate named inputを合成する `ViteEnvironmentInputAdapter`、feature descriptorの依存に従って明示hookを実行する `prepareViteClientEnvironment()` を接続済みです。SSG、Entry、IslandはApp Build用のenvironment configとlate preparationへ移行し、Comment、Svg、Sprite、Beautify、Archive、Bundleのoutput hookはclient environmentだけに制限し、ImageとSearchのsource transformもrender/clientへ分離しました。legacy render envでconfigを再評価するloaderはenvironment対応optionをrenderへ投影し、client限定のPreact aliasはrender bundleのReact関連importをexternalizeして分離します。plugin名と順序がrender/clientで異なるconfigはstable diagnosticを出して同一processの `LegacyViteBuilderAdapter` へfallbackします。未対応CLI flagのみ二processのVite CLI fallbackを使用します。build sessionはbuildId、ArtifactStore、diagnostic collectorを持ち、CLIは成功、失敗、fallbackの全経路でArtifactStoreをclearします。App Builderはclient outputをCore `OutputManifest` schema v1へ変換し、raw Vite outputやBuilderを公開resultへ含めません。programmatic App／legacy client buildはoutDir transactionを使い、失敗時にpartial outputを以前の正常な出力へrollbackします。全compatibility plugin、Preact、plugin mismatchのCLI fixtureで出力とfallbackを確認済みです。

- CLIを `spawn("vite")` 二回からprogrammatic Minista application runnerへ変更
- Vite configに `render` / `client` environmentを構成
- 単一の `createBuilder()` で一つのlifecycleを開始し、environmentを明示的に順次build
- render environmentを先にbuildし、native importでbuild-time moduleを評価
- graph / generated entry planを明示ArtifactStoreに保存
- client environmentは安定したvirtual entryをinputとし、graph planからisland / asset entryを解決
- output manifestをCoreのcompose / emitへ返す
- failure時のbuildId cleanupとpartial output policyを追加。programmatic pathは実装済み
- `--oneBuild` はv5で削除し、指定時に`MINISTA_CLI_OPTION_REMOVED` errorを返す

Environment APIはRC、`createBuilder` / `buildApp` hookはVite 8.2.1の型上experimentalです。そのためadapterのcompatibility testとVite minor pinning policyを設け、旧二回buildを一つのminor releaseのfallbackとして残してから削除します。

完了条件: `minista build` がVite CLIを二回spawnせず、render → client → compose → emitを一つのresult / diagnostic collectionで返す。

## Stage 6: ModuleRunner dev adapter

進捗: 完了。`ViteDevServerAdapter` で通常のdev CLIをprogrammatic custom serverへ切り替え、create／listen／起動後設定／closeのerrorをoperation付きstable diagnosticへ変換しました。`ViteDevModuleEvaluator` がModuleRunner評価をCore portへ適合させ、import errorをenvironment／module ID／安全なsource location付きdiagnosticへ変換します。`DevPageCache` はsnapshotと同時load、`LegacySsgRouteCache` はrouteごとのdiscovery／`getStaticData()`／PageNode解決、`DevRenderCache` はPageNodeごとのHTMLを保持します。変更moduleはenvironment graphのimporter traversalから影響RouteNodeへ投影し、未影響routeのresolveとrenderを再実行しません。Project Graph全体はcache entryから再構成してglobal invariantを毎回検証します。`ViteDevUpdateAdapter` はenvironment別module graphとhot channelを所有し、plugin／CLIからlegacy `ssrLoadModule()`、mixed graph、`server.ws` 直接利用を除去しました。page固有変更とSprite／Image Artifact変更は該当URLだけをreloadし、layoutなど全体変更だけ標準full reloadへfallbackします。2ページfixtureで未影響pageの`getStaticData()`とrenderが再実行されず、page／Sprite／Image変更で影響URLだけを通知することを確認済みです。

- dev CLIをprogrammatic `createServer({ appType: "custom" })` に移す。実装済み
- `render` environmentの `RunnableDevEnvironment.runner.import()` でpage moduleを評価。移行中の `ssr` environmentに対して実装済み
- requestごとの全pages再評価をsnapshot cacheで除去し、route／module dependency単位のresolve cacheを実装済み
- environmentごとのmodule graphと `hotUpdate` を使用
- source change → affected RouteNode／PageNodeを特定済み。Sprite／Image Artifact edgeも実装済み
- page固有document変更とSprite／Image Artifact変更は該当URLだけreloadし、layoutなど全体変更だけ標準full reloadを使用
- `server.ssrLoadModule`、mixed module graph、`server.ws` のplugin／CLI直接利用を削除済み

完了条件: build用render bundleを生成せずにdev renderingが動作し、page/layout/static dataの変更が該当graph nodeをinvalidationする。

## Stage 7: manifest / inspect / explain

進捗: 完了。Project Manifest schema v1、安全なallowlist projection、安定key orderのserializer、同一directory内の一時ファイルとrenameを使うatomic writerを実装し、通常のApp Build、programmatic legacy fallback、別processの外部Vite CLI fallbackから `.minista/manifest.json` を出力します。外部fallbackはbuildId付きprivate handoffを両build成功後だけ公開metadataへ昇格し、失敗時に候補を残しません。絶対pathとruntime-only propsを含めないprojection test、serializerとwriterのtest、実Vite fixtureのbuild出力testを追加済みです。Project Manifestは全client outputのsafe catalogとPage→HTML output edgeを持ち、`inspect --manifest` のcountsからoutput数を取得できます。明示的な `api.minista.outputClaims()` protocol、Vite collector、Core graph materializerを追加し、SSG、Entry、Island、Image、Sprite、Search、Archive、BundleのArtifact owner、generated Asset、Page consumer、output locationを全build経路でGraphへ統合しました。各featureがgenerate／bundle／finalize時に確定したfile nameと解析済みPage参照をclaimに使い、存在しないoutput／feature ownerへのclaimはstable diagnosticにします。外部fallbackも`closeBundle`でfilesystem上の最終出力と再照合するため、Archive出力を含めて公開manifestへ反映します。`inspect` / `inspect --json` / `explain` とstdout／stderr分離はsource query経路で実装済みです。`inspect --manifest` はVite serverとuser moduleを起動せず公開manifestだけを読み、missing、invalid、unsupported versionをstructured diagnosticとして返します。schema migration registryとmigration failure diagnosticも実装済みです。v1が最初の公開schemaのためbuilt-in migrationはまだありません。`.minista/diagnostics.json` schema v1とatomic writerも実装し、`check` の成功／失敗と全build compatibility経路の成功時に保存します。将来のtool adapter向けに`minista/internal/query` subpathを追加し、manifestだけを対象とする`inspect`／`trace-page` requestをCLIと共有します。

- `.minista/manifest.json` schema v1とatomic writerを通常のApp Buildへ実装済み
- absolute path / arbitrary props / secret-like configのredaction testを追加済み
- `inspect`, `inspect --json`, `explain` をCore query service上に実装済み
- JSON stdoutとlog stderrを分離済み
- manifestを直接読む `inspect --manifest` とunsupported version diagnosticを実装済み
- `.minista/diagnostics.json` schema v1を `check` と通常のApp Buildへ実装済み
- programmatic legacy fallbackへProject Manifest／diagnostics出力を接続済み
- manifest migration registryとfailure diagnosticを実装済み
- 別processの外部Vite CLI fallbackへprivate handoff経由のmetadata出力を接続済み
- 全client output catalogとPage→HTML output edgeをProject Manifestへ反映済み
- output claim protocolとSSG／Entry／Island／Image／Sprite／Search／Archive／BundleのAsset／Artifact owner・consumer edgeを共通Project Graphへ統合済み
- 将来の `@minista/mcp` が使用できるread-only query APIを`minista/internal/query` boundaryとして実装済み

完了条件: source全体を解析しなくてもroute → page → generated asset → outputの関係をJSONから追える。

## Stage 8: compatibility facade cleanup

進捗: 進行中。runtime implementationのJavaScript + JSDoc移行と隣接`.d.ts`は完了済みです。`--oneBuild`と専用分岐を削除し、旧option指定時はstable diagnosticで拒否します。外部Vite CLI fallbackのrendered pages／Island snippetsをbuildId scopeのschema付きJSONへ移行し、Entry／Islandによるexecutable data module importも削除しました。`ViteBuildDataReader`へArtifactStore／外部JSONの選択とdomain parserを集約し、全compatibility pluginから旧`SsgPage`型を除去してdomainの`RenderedPage`へ統一しました。Comment／Svg／Beautify／Archiveは`ViteCompatibilityLifecycle` adapterを介してCore runnerのcompose／finalize phaseへ接続済みです。Searchもbuild済みHTML群をPage GraphとDocument Storeへ一括投影し、同adapterからanalyze／generate／composeを実行してSearchData Artifactと変更済みHTMLをVite bundleへ戻します。Spriteはgenerate後・compose前の出力解決境界を同adapterへ追加し、SVG ArtifactのVite asset登録と確定URLをCore composeへ返します。Imageも画像binaryとsource／file nameを分離した出力計画ArtifactをCore generateで作り、Vite asset登録後の確定URLをCore composeへ返すbuild lifecycleへ接続済みです。Entryはrendered pageのroot asset収集をCore analyzeへ、Vite bundle結果と確定script／CSS URLの反映をCore bundle／composeへ接続済みです。BundleもViteで確定したplanをCore bundleへ返し、ページ別output参照ArtifactからclaimとCore composeを生成します。Islandはsnippet handoff ArtifactをCore analyze／generateへ注入してsource planを作り、Vite bundle結果と確定URLをCore bundle／composeへ返す経路へ接続済みです。production SSGはPage Graph snapshotをCore render phaseへ渡し、`RenderedPage` Artifactとstructured render diagnosticを生成します。Archiveのbinary出力はdirectory逸脱を拒否する`NodeOutputWriter`だけがfilesystemへ反映し、Archiver errorは `MINISTA_ARCHIVE_FAILED` diagnosticへ変換します。Imageのmissing source、remote download、Sharp metadata／transform、cache errorと、Spriteのsource探索、filesystem読込、SVG／symbol parse、SVGO errorもoperation別のstable diagnosticへ変換します。共有HTML document adapterはparse、selector query、mutation、serializeのerrorをpage node ID付きのstable diagnosticへ変換し、Svg source resolverもmissing source以外のread／SVGO／parse errorを正規化します。Core runnerはadapter由来のstable diagnosticを汎用phase errorへ潰さず保持します。programmatic App／legacy buildの任意のVite／Rolldown errorは `MINISTA_VITE_BUILD_FAILED`、外部CLI processの起動／終了errorは `MINISTA_VITE_CLI_FAILED` へ正規化します。全build経路の失敗diagnosticはbuild ID付きworkspace snapshotへ保存します。production outputを持つfeature facadeのphase接続は完了しました。公開CLI／Config／Migration／package READMEをv5 lifecycleとmachine-readable commandへ更新し、`architecture.md`から旧Targetと未実装構造を除去しました。

output claim collectorはenvironment identityをproviderへ渡し、Archive／Sprite／Bundle／Image／Entry／Island／Searchのclaim stateをadapter storeへ分離しました。

Archiveはwrite hookのenvironment configからrootとbuilderを生成するように変更し、Comment／Beautify／Svgの適用判定とEntryのlegacy mode判定から不要なclosure flagを削除しました。environmentを公開しない `transformIndexHtml()` が所有するconfig stateは長寿命lifecycle移行と合わせて扱います。

Sprite／Imageはdev generator、watch対象、Page indexをserver identity単位へ分離し、production generator／root／baseをbundle environment configから生成するように変更しました。カスタムSSG経路のoptionalまたはwrapper HTML context serverは `ViteDevServerRegistry` が登録済みserverへ解決します。build中のdev用asset生成は除去し、production処理をgenerate lifecycleへ一本化しました。

Searchはmode／baseをsource transformのenvironment configから判定し、Bundleはroot／base／glob entryをbundle environment configから再構成してimported image集合をenvironment identity単位へ分離しました。Svg resolverもdev serverまたはproduction bundle environment identity単位へ分離し、build中のHTML変換をbundle hookへ一本化しました。

EntryはApp Buildのentry計画をclient environment identity単位へ分離し、root／base／build sessionをhook実行時のconfigから取得するように変更しました。Islandはdevのsnippet集合／module evaluatorをserver identity単位、productionのsnippet集合／entry／source planをenvironment identity単位へ分離し、mode／root／base／build sessionをenvironment configから判定します。

残るcleanupは次です。

- Vite hookごとの短命lifecycleをbuild全体のDocument Store／Artifact Store／traceへ統合する
- devのfeature別cacheと`transformIndexHtml()`をproductionと共通の長寿命lifecycleへ寄せる
- SSG plugin closureに残るconfig解決値とdev cache／page indexをserver／environment単位に分離する
- programmatic／外部CLI fallbackを縮退する
- plugin個別docsの内部挙動説明をv5 terminologyへ順次更新する

- runtime implementationを `.js` / `.jsx` + JSDocに統一
- public APIの隣接 `.d.ts` とinternal JSDoc typeを整理
- old `src/plugins` compatibility implementationを段階的に薄くする
- public docsをv5 lifecycleとcommandに更新
- `architecture.md` のTargetをCurrentに統合
- roadmapから完了済みの詳細をrelease note / ADRへ移す

## Experimental tracks

### Bundled Dev

stable dev pathの完了後に別matrixで試します。

- user opt-inの `experimental.bundledDev: true` をclient environmentへだけ渡す
- Coreはbundled / unbundledを知らず、Vite adapterのcapabilityとして扱う
- render environmentは初期状態で `isBundled: false`
- third-party plugin、virtual entry、Island HMR、custom HTML transformを重点検証

default化条件: Viteがstableと宣言し、主要fixtureとthird-party plugin matrixが通常devと同じcontractを満たすこと。

### shared plugins / shared config build

`builder.sharedPlugins` / `sharedConfigBuild` は初期実装では使用しません。phase間共有はProject Graph / ArtifactStoreの明示protocolで行います。Viteがstable化し、process内cacheが実測で必要になった場合だけadapter optimizationとして再検討します。

### MCP

v5初期要件ではありません。CLI / JSONと同じread-only query serviceが安定し、manifest schema v1を少なくとも一つのminor release維持した後に検討します。

## Risk register

| Risk | Mitigation |
| --- | --- |
| Vite RC / experimental APIの破壊的変更 | adapter隔離、minor matrix、fallback lifecycle、CoreにVite typeを入れない |
| HeadとReact static APIの一回render semantics | renderer contract、専用fixture、default切替gate |
| plugin outputの微妙な順序差 | golden integration outputとphase dependencyの明文化 |
| manifestにuser data / absolute pathが漏れる | allowlist serializerとredaction test |
| graphが巨大化する | read model分割、ID reference、inspect projection、content hash cacheは後段 |
| dual implementation期間の保守負担 | feature単位の短い移行、compatibility projection、削除条件を各stageに設定 |

## First implementation step

最初のcode changeはStage 0のcompatibility harnessです。特に `pluginSsg + pluginImage + pluginIsland + pluginEntry + pluginSearch` を含むfixtureで、現行二回buildのoutputと `.minista` handoffを固定します。これがないままCore skeletonから始めると、「内部改善」と「利用者から見た破壊」を区別できません。
